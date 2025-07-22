import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface VirusScanResult {
  fileId: string;
  status: 'clean' | 'infected' | 'error' | 'quarantined';
  engine: string;
  version: string;
  threats: string[];
  scannedAt: Date;
  scanDuration: number; // in milliseconds
  fileSize: number;
  checksum: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: {
    allowedMimeTypes?: string[];
    blockedMimeTypes?: string[];
    maxFileSize?: number;
    allowedExtensions?: string[];
    blockedExtensions?: string[];
    requireVirusScan?: boolean;
    quarantineOnThreat?: boolean;
    allowExecutables?: boolean;
    scanArchives?: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAccessLog {
  id: string;
  fileId: string;
  userId: string;
  action: 'upload' | 'download' | 'view' | 'delete' | 'share';
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorReason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ThreatIntelligence {
  hash: string;
  threatType: 'malware' | 'virus' | 'trojan' | 'ransomware' | 'adware' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  reportCount: number;
}

export class FileSecurityService {
  private tempDir = '/tmp/virus-scan';
  private quarantineDir = '/tmp/quarantine';

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Perform comprehensive virus scan on file
   */
  async scanFile(fileId: string, fileBuffer: Buffer, fileName: string): Promise<VirusScanResult> {
    const startTime = Date.now();
    const tempFilePath = path.join(this.tempDir, `${fileId}_${fileName}`);

    try {
      logger.info(`Starting virus scan for file: ${fileId}`);

      // Write file to temp location for scanning
      await fs.writeFile(tempFilePath, fileBuffer);

      // Calculate file checksum
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check against threat intelligence database
      const threatInfo = await this.checkThreatIntelligence(checksum);
      if (threatInfo) {
        logger.warn(`File ${fileId} matches known threat: ${threatInfo.threatType}`);
        
        const result: VirusScanResult = {
          fileId,
          status: 'infected',
          engine: 'ThreatIntelligence',
          version: '1.0',
          threats: [threatInfo.description],
          scannedAt: new Date(),
          scanDuration: Date.now() - startTime,
          fileSize: fileBuffer.length,
          checksum
        };

        await this.quarantineFile(fileId, fileBuffer, result);
        return result;
      }

      // Perform multiple scan engines
      const scanResults = await Promise.allSettled([
        this.scanWithClamAV(tempFilePath),
        this.scanWithCustomEngine(fileBuffer, fileName),
        this.performHeuristicAnalysis(fileBuffer, fileName)
      ]);

      // Aggregate results
      const threats: string[] = [];
      let status: VirusScanResult['status'] = 'clean';
      let engine = 'Multiple';

      scanResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.threats.length > 0) {
          threats.push(...result.value.threats);
          status = 'infected';
        }
      });

      const scanResult: VirusScanResult = {
        fileId,
        status,
        engine,
        version: '1.0',
        threats,
        scannedAt: new Date(),
        scanDuration: Date.now() - startTime,
        fileSize: fileBuffer.length,
        checksum
      };

      // Handle infected files
      if (status === 'infected') {
        await this.quarantineFile(fileId, fileBuffer, scanResult);
        await this.updateThreatIntelligence(checksum, threats);
      }

      // Store scan result
      await this.storeScanResult(scanResult);

      // Update file metadata
      await this.updateFileVirusScanStatus(fileId, scanResult);

      logger.info(`Virus scan completed for ${fileId}: ${status} (${Date.now() - startTime}ms)`);
      return scanResult;

    } catch (error) {
      logger.error(`Error scanning file ${fileId}:`, error);
      
      const errorResult: VirusScanResult = {
        fileId,
        status: 'error',
        engine: 'Error',
        version: '1.0',
        threats: [],
        scannedAt: new Date(),
        scanDuration: Date.now() - startTime,
        fileSize: fileBuffer.length,
        checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex')
      };

      await this.storeScanResult(errorResult);
      return errorResult;
    } finally {
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }

  /**
   * Validate file against security policies
   */
  async validateFile(
    fileName: string,
    mimeType: string,
    fileSize: number,
    policyId?: string
  ): Promise<{ valid: boolean; violations: string[] }> {
    try {
      const policy = policyId 
        ? await this.getSecurityPolicy(policyId)
        : await this.getDefaultSecurityPolicy();

      if (!policy) {
        return { valid: true, violations: [] };
      }

      const violations: string[] = [];
      const fileExtension = path.extname(fileName).toLowerCase();

      // Check file size
      if (policy.rules.maxFileSize && fileSize > policy.rules.maxFileSize) {
        violations.push(`File size ${fileSize} exceeds maximum allowed size ${policy.rules.maxFileSize}`);
      }

      // Check MIME type
      if (policy.rules.allowedMimeTypes && !policy.rules.allowedMimeTypes.includes(mimeType)) {
        violations.push(`MIME type ${mimeType} is not allowed`);
      }

      if (policy.rules.blockedMimeTypes && policy.rules.blockedMimeTypes.includes(mimeType)) {
        violations.push(`MIME type ${mimeType} is blocked`);
      }

      // Check file extension
      if (policy.rules.allowedExtensions && !policy.rules.allowedExtensions.includes(fileExtension)) {
        violations.push(`File extension ${fileExtension} is not allowed`);
      }

      if (policy.rules.blockedExtensions && policy.rules.blockedExtensions.includes(fileExtension)) {
        violations.push(`File extension ${fileExtension} is blocked`);
      }

      // Check for executables
      if (!policy.rules.allowExecutables && this.isExecutableFile(fileName, mimeType)) {
        violations.push('Executable files are not allowed');
      }

      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      logger.error('Error validating file:', error);
      return { valid: false, violations: ['Validation error occurred'] };
    }
  }

  /**
   * Log file access for security monitoring
   */
  async logFileAccess(
    fileId: string,
    userId: string,
    action: FileAccessLog['action'],
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorReason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const accessLog: Omit<FileAccessLog, 'id'> = {
        fileId,
        userId,
        action,
        ipAddress,
        userAgent,
        success,
        errorReason,
        timestamp: new Date(),
        metadata
      };

      await firestore.collection('fileAccessLogs').add(accessLog);

      // Check for suspicious activity
      await this.checkSuspiciousActivity(userId, ipAddress, action);
    } catch (error) {
      logger.error('Error logging file access:', error);
    }
  }

  /**
   * Get file access logs with filtering
   */
  async getFileAccessLogs(
    fileId?: string,
    userId?: string,
    action?: FileAccessLog['action'],
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<FileAccessLog[]> {
    try {
      let query = firestore.collection('fileAccessLogs');

      if (fileId) {
        query = query.where('fileId', '==', fileId);
      }

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      if (action) {
        query = query.where('action', '==', action);
      }

      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }

      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }

      const snapshot = await query
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileAccessLog[];
    } catch (error) {
      logger.error('Error getting file access logs:', error);
      return [];
    }
  }

  /**
   * Create or update security policy
   */
  async createSecurityPolicy(policyData: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy> {
    try {
      const now = new Date();
      const policy = {
        ...policyData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection('securityPolicies').add(policy);
      
      const createdPolicy: SecurityPolicy = {
        id: docRef.id,
        ...policy
      };

      logger.info(`Security policy created: ${createdPolicy.id}`);
      return createdPolicy;
    } catch (error) {
      logger.error('Error creating security policy:', error);
      throw error;
    }
  }

  /**
   * Get security policy by ID
   */
  async getSecurityPolicy(policyId: string): Promise<SecurityPolicy | null> {
    try {
      const doc = await firestore.collection('securityPolicies').doc(policyId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as SecurityPolicy;
    } catch (error) {
      logger.error(`Error getting security policy ${policyId}:`, error);
      return null;
    }
  }

  /**
   * Get quarantined files
   */
  async getQuarantinedFiles(limit: number = 50): Promise<VirusScanResult[]> {
    try {
      const snapshot = await firestore
        .collection('virusScanResults')
        .where('status', '==', 'quarantined')
        .orderBy('scannedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data()) as VirusScanResult[];
    } catch (error) {
      logger.error('Error getting quarantined files:', error);
      return [];
    }
  }

  /**
   * Release file from quarantine (admin only)
   */
  async releaseFromQuarantine(fileId: string, adminUserId: string): Promise<void> {
    try {
      // Verify admin permissions
      if (!await this.isUserAdmin(adminUserId)) {
        throw new Error('Admin permissions required');
      }

      // Update scan result
      await firestore
        .collection('virusScanResults')
        .where('fileId', '==', fileId)
        .get()
        .then(snapshot => {
          snapshot.docs.forEach(doc => {
            doc.ref.update({
              status: 'clean',
              releasedAt: new Date(),
              releasedBy: adminUserId
            });
          });
        });

      // Update file metadata
      await this.updateFileVirusScanStatus(fileId, {
        fileId,
        status: 'clean',
        engine: 'Manual',
        version: '1.0',
        threats: [],
        scannedAt: new Date(),
        scanDuration: 0,
        fileSize: 0,
        checksum: ''
      });

      logger.info(`File ${fileId} released from quarantine by ${adminUserId}`);
    } catch (error) {
      logger.error(`Error releasing file from quarantine ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Scan with ClamAV antivirus
   */
  private async scanWithClamAV(filePath: string): Promise<{ threats: string[] }> {
    try {
      const { stdout, stderr } = await execAsync(`clamscan --no-summary ${filePath}`);
      
      if (stderr) {
        logger.warn('ClamAV scan warning:', stderr);
      }

      // Parse ClamAV output
      const threats: string[] = [];
      if (stdout.includes('FOUND')) {
        const lines = stdout.split('\n');
        lines.forEach(line => {
          if (line.includes('FOUND')) {
            const threat = line.split(':')[1]?.trim().replace(' FOUND', '');
            if (threat) {
              threats.push(threat);
            }
          }
        });
      }

      return { threats };
    } catch (error) {
      logger.warn('ClamAV scan failed:', error);
      return { threats: [] };
    }
  }

  /**
   * Custom malware detection engine
   */
  private async scanWithCustomEngine(fileBuffer: Buffer, fileName: string): Promise<{ threats: string[] }> {
    const threats: string[] = [];

    try {
      // Check for suspicious file signatures
      const signatures = [
        { pattern: Buffer.from('4D5A', 'hex'), name: 'PE_Executable' },
        { pattern: Buffer.from('504B0304', 'hex'), name: 'ZIP_Archive' },
        { pattern: Buffer.from('526172211A0700', 'hex'), name: 'RAR_Archive' },
        { pattern: Buffer.from('377ABCAF271C', 'hex'), name: '7Z_Archive' }
      ];

      // Check file header signatures
      signatures.forEach(sig => {
        if (fileBuffer.subarray(0, sig.pattern.length).equals(sig.pattern)) {
          if (this.isSuspiciousExecutable(fileName, sig.name)) {
            threats.push(`Suspicious_${sig.name}`);
          }
        }
      });

      // Check for embedded scripts
      const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));
      const scriptPatterns = [
        /eval\s*\(/gi,
        /document\.write\s*\(/gi,
        /window\.location\s*=/gi,
        /<script[^>]*>/gi,
        /javascript:/gi
      ];

      scriptPatterns.forEach((pattern, index) => {
        if (pattern.test(fileContent)) {
          threats.push(`Embedded_Script_${index}`);
        }
      });

      // Check for suspicious strings
      const suspiciousStrings = [
        'cmd.exe',
        'powershell',
        'system32',
        'registry',
        'bitcoin',
        'cryptocurrency',
        'ransomware'
      ];

      suspiciousStrings.forEach(str => {
        if (fileContent.toLowerCase().includes(str.toLowerCase())) {
          threats.push(`Suspicious_String_${str}`);
        }
      });

      return { threats };
    } catch (error) {
      logger.warn('Custom engine scan failed:', error);
      return { threats: [] };
    }
  }

  /**
   * Perform heuristic analysis
   */
  private async performHeuristicAnalysis(fileBuffer: Buffer, fileName: string): Promise<{ threats: string[] }> {
    const threats: string[] = [];

    try {
      // Entropy analysis (high entropy might indicate encryption/packing)
      const entropy = this.calculateEntropy(fileBuffer);
      if (entropy > 7.5) {
        threats.push('High_Entropy_Suspicious');
      }

      // File size vs content ratio
      const textContent = fileBuffer.toString('utf8').replace(/[^\x20-\x7E]/g, '');
      const textRatio = textContent.length / fileBuffer.length;
      
      if (textRatio < 0.1 && fileBuffer.length > 1000) {
        threats.push('Low_Text_Ratio_Suspicious');
      }

      // Check for multiple embedded files
      const embeddedFileCount = this.countEmbeddedFiles(fileBuffer);
      if (embeddedFileCount > 5) {
        threats.push('Multiple_Embedded_Files');
      }

      return { threats };
    } catch (error) {
      logger.warn('Heuristic analysis failed:', error);
      return { threats: [] };
    }
  }

  /**
   * Calculate Shannon entropy of file
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequencies: Record<number, number> = {};
    
    // Count byte frequencies
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      frequencies[byte] = (frequencies[byte] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    const length = buffer.length;
    
    Object.values(frequencies).forEach(freq => {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
  }

  /**
   * Count embedded files in buffer
   */
  private countEmbeddedFiles(buffer: Buffer): number {
    const signatures = [
      Buffer.from('4D5A', 'hex'), // PE
      Buffer.from('504B0304', 'hex'), // ZIP
      Buffer.from('FFD8FF', 'hex'), // JPEG
      Buffer.from('89504E47', 'hex'), // PNG
      Buffer.from('25504446', 'hex') // PDF
    ];

    let count = 0;
    signatures.forEach(sig => {
      let index = 0;
      while ((index = buffer.indexOf(sig, index)) !== -1) {
        count++;
        index += sig.length;
      }
    });

    return count;
  }

  /**
   * Check if file is suspicious executable
   */
  private isSuspiciousExecutable(fileName: string, signatureType: string): boolean {
    const suspiciousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js'];
    const fileExt = path.extname(fileName).toLowerCase();
    
    return suspiciousExtensions.includes(fileExt) || signatureType.includes('Executable');
  }

  /**
   * Check threat intelligence database
   */
  private async checkThreatIntelligence(checksum: string): Promise<ThreatIntelligence | null> {
    try {
      const doc = await firestore.collection('threatIntelligence').doc(checksum).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data() as ThreatIntelligence;
    } catch (error) {
      logger.error('Error checking threat intelligence:', error);
      return null;
    }
  }

  /**
   * Update threat intelligence database
   */
  private async updateThreatIntelligence(checksum: string, threats: string[]): Promise<void> {
    try {
      const threatData: ThreatIntelligence = {
        hash: checksum,
        threatType: 'malware',
        severity: 'high',
        description: threats.join(', '),
        source: 'Internal_Scan',
        firstSeen: new Date(),
        lastSeen: new Date(),
        reportCount: 1
      };

      await firestore.collection('threatIntelligence').doc(checksum).set(threatData, { merge: true });
    } catch (error) {
      logger.error('Error updating threat intelligence:', error);
    }
  }

  /**
   * Quarantine infected file
   */
  private async quarantineFile(fileId: string, fileBuffer: Buffer, scanResult: VirusScanResult): Promise<void> {
    try {
      const quarantinePath = path.join(this.quarantineDir, `${fileId}_quarantined`);
      await fs.writeFile(quarantinePath, fileBuffer);
      
      scanResult.status = 'quarantined';
      
      logger.warn(`File ${fileId} quarantined due to threats: ${scanResult.threats.join(', ')}`);
    } catch (error) {
      logger.error(`Error quarantining file ${fileId}:`, error);
    }
  }

  /**
   * Store virus scan result
   */
  private async storeScanResult(result: VirusScanResult): Promise<void> {
    try {
      await firestore.collection('virusScanResults').add(result);
    } catch (error) {
      logger.error('Error storing scan result:', error);
    }
  }

  /**
   * Update file metadata with virus scan status
   */
  private async updateFileVirusScanStatus(fileId: string, scanResult: VirusScanResult): Promise<void> {
    try {
      await firestore.collection('fileMetadata').doc(fileId).update({
        'virus_scan.status': scanResult.status,
        'virus_scan.scannedAt': scanResult.scannedAt,
        'virus_scan.engine': scanResult.engine,
        'virus_scan.threats': scanResult.threats
      });
    } catch (error) {
      logger.error(`Error updating file virus scan status ${fileId}:`, error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string, ipAddress: string, action: string): Promise<void> {
    try {
      // Check for rapid successive downloads
      if (action === 'download') {
        const recentDownloads = await firestore
          .collection('fileAccessLogs')
          .where('userId', '==', userId)
          .where('action', '==', 'download')
          .where('timestamp', '>=', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
          .count()
          .get();

        if (recentDownloads.data().count > 10) {
          logger.warn(`Suspicious download activity detected for user ${userId}: ${recentDownloads.data().count} downloads in 5 minutes`);
          
          // Log security alert
          await firestore.collection('securityAlerts').add({
            type: 'suspicious_download_activity',
            userId,
            ipAddress,
            details: `${recentDownloads.data().count} downloads in 5 minutes`,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error checking suspicious activity:', error);
    }
  }

  /**
   * Get default security policy
   */
  private async getDefaultSecurityPolicy(): Promise<SecurityPolicy | null> {
    try {
      const snapshot = await firestore
        .collection('securityPolicies')
        .where('name', '==', 'default')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SecurityPolicy;
    } catch (error) {
      logger.error('Error getting default security policy:', error);
      return null;
    }
  }

  /**
   * Check if file is executable
   */
  private isExecutableFile(fileName: string, mimeType: string): boolean {
    const executableExtensions = [
      '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.pif',
      '.app', '.deb', '.rpm', '.dmg', '.pkg',
      '.sh', '.bash', '.zsh', '.ps1', '.vbs', '.js'
    ];
    
    const executableMimeTypes = [
      'application/x-executable',
      'application/x-msdos-program',
      'application/x-msdownload',
      'application/x-sh',
      'application/x-shellscript'
    ];

    const fileExt = path.extname(fileName).toLowerCase();
    
    return executableExtensions.includes(fileExt) || executableMimeTypes.includes(mimeType);
  }

  /**
   * Check if user is admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      const role = userDoc.exists ? userDoc.data()?.role : null;
      return role === 'admin' || role === 'super_admin';
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.tempDir, { recursive: true }),
        fs.mkdir(this.quarantineDir, { recursive: true })
      ]);
    } catch (error) {
      logger.error('Error creating security directories:', error);
    }
  }
}

export const fileSecurityService = new FileSecurityService();
export default fileSecurityService;
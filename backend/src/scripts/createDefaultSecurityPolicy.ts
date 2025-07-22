import { firestore } from '../config/firebaseAdmin';
import { SecurityPolicy } from '../services/fileSecurityService';
import logger from '../services/loggerService';

/**
 * Script to create default security policies for file uploads
 * 
 * This script creates predefined security policies in Firestore that will be used
 * to validate file uploads based on different use cases and security requirements.
 */
async function createDefaultSecurityPolicies(): Promise<void> {
  try {
    logger.info('Starting creation of default security policies');
    
    // Check if default policy already exists
    const defaultPolicySnapshot = await firestore
      .collection('securityPolicies')
      .where('name', '==', 'default')
      .get();
    
    if (!defaultPolicySnapshot.empty) {
      logger.info('Default security policy already exists, skipping creation');
      return;
    }

    // Create default security policy
    const defaultPolicy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'default',
      description: 'Default security policy for all file uploads',
      rules: {
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'video/mp4', 'video/webm', 'video/quicktime',
          'application/pdf', 
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv',
          'application/zip', 'application/x-zip-compressed'
        ],
        blockedMimeTypes: [
          'application/x-msdownload', 'application/x-executable',
          'application/x-dosexec', 'application/x-msdos-program'
        ],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedExtensions: [
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
          '.mp4', '.webm', '.mov',
          '.pdf',
          '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.txt', '.csv',
          '.zip'
        ],
        blockedExtensions: [
          '.exe', '.bat', '.cmd', '.msi', '.dll', '.com', '.pif', '.scr',
          '.vbs', '.js', '.jse', '.wsf', '.wsh', '.ps1', '.ps1xml', '.ps2', '.ps2xml',
          '.psc1', '.psc2', '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml'
        ],
        requireVirusScan: true,
        quarantineOnThreat: true,
        allowExecutables: false,
        scanArchives: true
      },
      isActive: true
    };

    // Create strict security policy for sensitive uploads
    const strictPolicy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'strict',
      description: 'Strict security policy for sensitive file uploads',
      rules: {
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        blockedMimeTypes: [
          'application/x-msdownload', 'application/x-executable',
          'application/x-dosexec', 'application/x-msdos-program',
          'application/zip', 'application/x-zip-compressed',
          'application/x-rar-compressed'
        ],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedExtensions: [
          '.jpg', '.jpeg', '.png', '.gif',
          '.pdf',
          '.doc', '.docx',
          '.txt'
        ],
        blockedExtensions: [
          '.exe', '.bat', '.cmd', '.msi', '.dll', '.com', '.pif', '.scr',
          '.vbs', '.js', '.jse', '.wsf', '.wsh', '.ps1', '.zip', '.rar',
          '.7z', '.tar', '.gz'
        ],
        requireVirusScan: true,
        quarantineOnThreat: true,
        allowExecutables: false,
        scanArchives: true
      },
      isActive: true
    };

    // Create media-focused security policy
    const mediaPolicy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'media',
      description: 'Security policy optimized for media file uploads',
      rules: {
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
          'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'
        ],
        maxFileSize: 200 * 1024 * 1024, // 200MB
        allowedExtensions: [
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
          '.mp4', '.webm', '.mov', '.avi',
          '.mp3', '.wav', '.ogg', '.m4a'
        ],
        requireVirusScan: true,
        quarantineOnThreat: true,
        allowExecutables: false,
        scanArchives: false
      },
      isActive: true
    };

    // Create document-focused security policy
    const documentPolicy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'documents',
      description: 'Security policy optimized for document file uploads',
      rules: {
        allowedMimeTypes: [
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv', 'text/html',
          'application/rtf', 'application/x-rtf'
        ],
        maxFileSize: 25 * 1024 * 1024, // 25MB
        allowedExtensions: [
          '.pdf',
          '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.txt', '.csv', '.html', '.rtf'
        ],
        requireVirusScan: true,
        quarantineOnThreat: true,
        allowExecutables: false,
        scanArchives: false
      },
      isActive: true
    };

    // Create archive-focused security policy
    const archivePolicy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'archives',
      description: 'Security policy for archive file uploads with enhanced scanning',
      rules: {
        allowedMimeTypes: [
          'application/zip', 'application/x-zip-compressed',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          'application/x-tar', 'application/gzip'
        ],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedExtensions: [
          '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'
        ],
        requireVirusScan: true,
        quarantineOnThreat: true,
        allowExecutables: false,
        scanArchives: true
      },
      isActive: true
    };

    // Create batch for writing all policies
    const batch = firestore.batch();
    
    // Add policies to batch
    const defaultPolicyRef = firestore.collection('securityPolicies').doc();
    const strictPolicyRef = firestore.collection('securityPolicies').doc();
    const mediaPolicyRef = firestore.collection('securityPolicies').doc();
    const documentPolicyRef = firestore.collection('securityPolicies').doc();
    const archivePolicyRef = firestore.collection('securityPolicies').doc();

    const now = new Date();
    
    batch.set(defaultPolicyRef, {
      ...defaultPolicy,
      createdAt: now,
      updatedAt: now
    });
    
    batch.set(strictPolicyRef, {
      ...strictPolicy,
      createdAt: now,
      updatedAt: now
    });
    
    batch.set(mediaPolicyRef, {
      ...mediaPolicy,
      createdAt: now,
      updatedAt: now
    });
    
    batch.set(documentPolicyRef, {
      ...documentPolicy,
      createdAt: now,
      updatedAt: now
    });
    
    batch.set(archivePolicyRef, {
      ...archivePolicy,
      createdAt: now,
      updatedAt: now
    });

    // Commit the batch
    await batch.commit();

    logger.info('Successfully created default security policies');
    logger.info(`Created policies: default (${defaultPolicyRef.id}), strict (${strictPolicyRef.id}), media (${mediaPolicyRef.id}), documents (${documentPolicyRef.id}), archives (${archivePolicyRef.id})`);

  } catch (error) {
    logger.error('Error creating default security policies:', error);
    throw error;
  }
}

// Execute if this script is run directly
if (require.main === module) {
  createDefaultSecurityPolicies()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export default createDefaultSecurityPolicies;
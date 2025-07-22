import { queueService } from '../queueService';
import { fileStorageService } from '../fileStorageService';
import { firestore } from '../../config/firebaseAdmin';
import logger from '../loggerService';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvStringifier } from 'csv-writer';

export interface ExportQueueData {
  type: 'users' | 'sessions' | 'prototypes' | 'analytics' | 'custom';
  userId: string;
  filters?: Record<string, any>;
  fields?: string[];
  format: 'csv' | 'json' | 'xlsx';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  customQuery?: {
    collection: string;
    where?: Array<[string, '==' | '!=' | '>' | '>=' | '<' | '<=', any]>;
    orderBy?: [string, 'asc' | 'desc'];
    limit?: number;
  };
  notifyEmail?: string;
}

/**
 * Initialize export queue processor
 */
export function initializeExportQueueProcessor(): void {
  // Register export queue processor
  queueService.registerQueue<ExportQueueData>('exportQueue', async (data, job) => {
    logger.info(`Processing export job ${job.id} of type ${data.type}`);
    
    try {
      // Create temp directory for export
      const tempDir = path.join('/tmp', 'exports');
      await fs.mkdir(tempDir, { recursive: true });
      
      const exportId = uuidv4();
      const tempFilePath = path.join(tempDir, `export_${exportId}`);
      
      let exportData: any[] = [];
      let fileName: string;
      
      // Fetch data based on export type
      switch (data.type) {
        case 'users':
          exportData = await fetchUserData(data);
          fileName = `users_export_${new Date().toISOString().split('T')[0]}.${data.format}`;
          break;
          
        case 'sessions':
          exportData = await fetchSessionData(data);
          fileName = `sessions_export_${new Date().toISOString().split('T')[0]}.${data.format}`;
          break;
          
        case 'prototypes':
          exportData = await fetchPrototypeData(data);
          fileName = `prototypes_export_${new Date().toISOString().split('T')[0]}.${data.format}`;
          break;
          
        case 'analytics':
          exportData = await fetchAnalyticsData(data);
          fileName = `analytics_export_${new Date().toISOString().split('T')[0]}.${data.format}`;
          break;
          
        case 'custom':
          if (!data.customQuery) {
            throw new Error('Custom query is required for custom export');
          }
          exportData = await fetchCustomData(data.customQuery);
          fileName = `custom_export_${new Date().toISOString().split('T')[0]}.${data.format}`;
          break;
          
        default:
          throw new Error(`Unknown export type: ${data.type}`);
      }
      
      // Generate export file based on format
      let fileBuffer: Buffer;
      
      switch (data.format) {
        case 'csv':
          fileBuffer = await generateCsvFile(exportData, tempFilePath);
          break;
          
        case 'json':
          fileBuffer = await generateJsonFile(exportData, tempFilePath);
          break;
          
        case 'xlsx':
          fileBuffer = await generateXlsxFile(exportData, tempFilePath);
          break;
          
        default:
          throw new Error(`Unsupported export format: ${data.format}`);
      }
      
      // Upload export file to storage
      const fileMetadata = await fileStorageService.uploadFile(
        fileBuffer,
        fileName,
        data.userId,
        {
          category: 'temp_files',
          subcategory: 'exports',
          isPublic: false,
          accessLevel: 'private',
          allowedUsers: [data.userId],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      );
      
      // Create export record
      const exportRecord = {
        id: exportId,
        userId: data.userId,
        type: data.type,
        format: data.format,
        fileId: fileMetadata.id,
        fileName: fileMetadata.originalName,
        fileUrl: fileMetadata.url,
        fileSize: fileMetadata.size,
        recordCount: exportData.length,
        createdAt: new Date(),
        expiresAt: fileMetadata.expiresAt
      };
      
      await firestore.collection('exports').doc(exportId).set(exportRecord);
      
      // Send notification if email provided
      if (data.notifyEmail) {
        // Import email queue processor
        const { queueEmail } = await import('./emailQueueProcessor');
        
        await queueEmail({
          type: 'custom',
          to: data.notifyEmail,
          subject: `Your ${data.type} export is ready`,
          template: 'notification',
          context: {
            name: data.userId,
            notification: {
              title: `Your ${data.type} export is ready`,
              message: `Your requested export of ${exportData.length} records is now available for download.`,
              actionUrl: fileMetadata.url,
              actionText: 'Download Export'
            }
          }
        });
      }
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});
      
      return exportRecord;
    } catch (error) {
      logger.error(`Error processing export job ${job.id}:`, error);
      throw error;
    }
  }, {
    concurrency: 2, // Process up to 2 exports at once (resource intensive)
    pollInterval: 30000, // Check for new exports every 30 seconds
    visibilityTimeout: 600000 // 10 minutes for exports
  });
  
  // Start processing the queue
  queueService.startProcessing('exportQueue');
  logger.info('Export queue processor initialized');
}

/**
 * Add export job to queue
 */
export async function queueExport(data: ExportQueueData): Promise<string> {
  const job = await queueService.addJob('exportQueue', data, {
    priority: 0,
    maxAttempts: 2 // Retry failed exports once
  });
  
  return job.id;
}

/**
 * Fetch user data for export
 */
async function fetchUserData(data: ExportQueueData): Promise<any[]> {
  let query = firestore.collection('users');
  
  // Apply filters
  if (data.filters) {
    Object.entries(data.filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(field, '==', value);
      }
    });
  }
  
  // Apply date range if specified
  if (data.dateRange) {
    const startDate = new Date(data.dateRange.startDate);
    const endDate = new Date(data.dateRange.endDate);
    query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
  }
  
  const snapshot = await query.get();
  
  // Map documents to objects
  const users = snapshot.docs.map(doc => {
    const userData = doc.data();
    
    // Filter fields if specified
    if (data.fields && data.fields.length > 0) {
      const filteredData: Record<string, any> = { id: doc.id };
      data.fields.forEach(field => {
        if (field in userData) {
          filteredData[field] = userData[field];
        }
      });
      return filteredData;
    }
    
    // Remove sensitive fields
    const { password, authTokens, ...safeData } = userData;
    return { id: doc.id, ...safeData };
  });
  
  return users;
}

/**
 * Fetch session data for export
 */
async function fetchSessionData(data: ExportQueueData): Promise<any[]> {
  let query = firestore.collection('sessions');
  
  // Apply filters
  if (data.filters) {
    Object.entries(data.filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(field, '==', value);
      }
    });
  }
  
  // Apply date range if specified
  if (data.dateRange) {
    const startDate = new Date(data.dateRange.startDate);
    const endDate = new Date(data.dateRange.endDate);
    query = query.where('startTime', '>=', startDate).where('startTime', '<=', endDate);
  }
  
  const snapshot = await query.get();
  
  // Map documents to objects
  const sessions = snapshot.docs.map(doc => {
    const sessionData = doc.data();
    
    // Filter fields if specified
    if (data.fields && data.fields.length > 0) {
      const filteredData: Record<string, any> = { id: doc.id };
      data.fields.forEach(field => {
        if (field in sessionData) {
          filteredData[field] = sessionData[field];
        }
      });
      return filteredData;
    }
    
    return { id: doc.id, ...sessionData };
  });
  
  return sessions;
}

/**
 * Fetch prototype data for export
 */
async function fetchPrototypeData(data: ExportQueueData): Promise<any[]> {
  let query = firestore.collection('prototypes');
  
  // Apply filters
  if (data.filters) {
    Object.entries(data.filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(field, '==', value);
      }
    });
  }
  
  // Apply date range if specified
  if (data.dateRange) {
    const startDate = new Date(data.dateRange.startDate);
    const endDate = new Date(data.dateRange.endDate);
    query = query.where('createdAt', '>=', startDate).where('createdAt', '<=', endDate);
  }
  
  const snapshot = await query.get();
  
  // Map documents to objects
  const prototypes = snapshot.docs.map(doc => {
    const prototypeData = doc.data();
    
    // Filter fields if specified
    if (data.fields && data.fields.length > 0) {
      const filteredData: Record<string, any> = { id: doc.id };
      data.fields.forEach(field => {
        if (field in prototypeData) {
          filteredData[field] = prototypeData[field];
        }
      });
      return filteredData;
    }
    
    return { id: doc.id, ...prototypeData };
  });
  
  return prototypes;
}

/**
 * Fetch analytics data for export
 */
async function fetchAnalyticsData(data: ExportQueueData): Promise<any[]> {
  let query = firestore.collection('analyticsReports');
  
  // Apply date range if specified
  if (data.dateRange) {
    const startDate = new Date(data.dateRange.startDate);
    const endDate = new Date(data.dateRange.endDate);
    query = query.where('date', '>=', startDate).where('date', '<=', endDate);
  }
  
  // Order by date
  query = query.orderBy('date', 'asc');
  
  const snapshot = await query.get();
  
  // Map documents to objects
  const reports = snapshot.docs.map(doc => {
    const reportData = doc.data();
    
    // Filter fields if specified
    if (data.fields && data.fields.length > 0) {
      const filteredData: Record<string, any> = { id: doc.id };
      data.fields.forEach(field => {
        if (field in reportData) {
          filteredData[field] = reportData[field];
        } else if (field.startsWith('metrics.') && reportData.metrics) {
          const metricField = field.split('.')[1];
          if (metricField in reportData.metrics) {
            filteredData[field] = reportData.metrics[metricField];
          }
        }
      });
      return filteredData;
    }
    
    return { id: doc.id, ...reportData };
  });
  
  return reports;
}

/**
 * Fetch custom data for export
 */
async function fetchCustomData(customQuery: ExportQueueData['customQuery']): Promise<any[]> {
  if (!customQuery) {
    throw new Error('Custom query is required');
  }
  
  let query = firestore.collection(customQuery.collection);
  
  // Apply where clauses
  if (customQuery.where) {
    customQuery.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }
  
  // Apply order by
  if (customQuery.orderBy) {
    query = query.orderBy(customQuery.orderBy[0], customQuery.orderBy[1]);
  }
  
  // Apply limit
  if (customQuery.limit) {
    query = query.limit(customQuery.limit);
  }
  
  const snapshot = await query.get();
  
  // Map documents to objects
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Generate CSV file from data
 */
async function generateCsvFile(data: any[], filePath: string): Promise<Buffer> {
  if (data.length === 0) {
    return Buffer.from('');
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]).map(header => ({
    id: header,
    title: header
  }));
  
  // Create CSV stringifier
  const csvStringifier = createObjectCsvStringifier({
    header: headers
  });
  
  // Generate CSV content
  const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);
  
  // Write to file
  await fs.writeFile(filePath, csvContent);
  
  // Read file as buffer
  return fs.readFile(filePath);
}

/**
 * Generate JSON file from data
 */
async function generateJsonFile(data: any[], filePath: string): Promise<Buffer> {
  // Convert data to JSON string
  const jsonContent = JSON.stringify(data, null, 2);
  
  // Write to file
  await fs.writeFile(filePath, jsonContent);
  
  // Read file as buffer
  return fs.readFile(filePath);
}

/**
 * Generate XLSX file from data
 */
async function generateXlsxFile(data: any[], filePath: string): Promise<Buffer> {
  // For XLSX generation, we'd typically use a library like ExcelJS
  // This is a simplified implementation
  
  // Import ExcelJS dynamically
  const { Workbook } = await import('exceljs');
  
  // Create workbook and worksheet
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Data');
  
  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // Handle objects
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        
        return value;
      });
      
      worksheet.addRow(row);
    });
  }
  
  // Write to file
  await workbook.xlsx.writeFile(filePath);
  
  // Read file as buffer
  return fs.readFile(filePath);
}

export default {
  initializeExportQueueProcessor,
  queueExport
};
import Papa from 'papaparse';
import type { AssetEntry } from '../db';
import { assetDb, ALLOWED_PLATFORMS } from '../db';

interface CSVRow {
  Date: string;
  Platform: string;
  Amount: string;
  Rate: string;
  TransactionType?: string;
  ContributionAmount?: string;
  AccountType?: string;
  Benchmark?: string;
  Notes?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Enhanced validation functions
const isValidDate = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateStr;
};

const isValidNumber = (numStr: string): boolean => {
  if (!numStr || typeof numStr !== 'string') return false;
  const num = parseFloat(numStr.trim());
  return !isNaN(num) && isFinite(num);
};

const isValidPlatform = (platform: string): boolean => {
  if (!platform || typeof platform !== 'string') return false;
  const trimmed = platform.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
};

const isValidTransactionType = (type?: string): boolean => {
  if (!type) return true; // Optional field
  return ['snapshot', 'contribution'].includes(type.toLowerCase());
};

const validateRow = (row: CSVRow, rowIndex: number): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validations
  if (!isValidDate(row.Date)) {
    errors.push(`Row ${rowIndex}: Invalid date format. Expected YYYY-MM-DD (e.g., 2024-01-15)`);
  }
  
  if (!isValidPlatform(row.Platform)) {
    errors.push(`Row ${rowIndex}: Platform name is required and must be 1-50 characters`);
  }
  
  if (!isValidNumber(row.Amount)) {
    errors.push(`Row ${rowIndex}: Amount must be a valid number (e.g., 15000.50)`);
  } else {
    const amount = parseFloat(row.Amount);
    if (amount < 0) {
      errors.push(`Row ${rowIndex}: Amount cannot be negative`);
    }
    if (amount > 1000000000) {
      warnings.push(`Row ${rowIndex}: Amount seems unusually large (${amount})`);
    }
  }
  
  if (!isValidNumber(row.Rate)) {
    errors.push(`Row ${rowIndex}: Rate must be a valid number (e.g., 7.5 for 7.5%)`);
  } else {
    const rate = parseFloat(row.Rate);
    if (rate < -100 || rate > 100) {
      warnings.push(`Row ${rowIndex}: Rate ${rate}% seems unusual (expected -100% to 100%)`);
    }
  }
  
  // Optional field validations
  if (row.TransactionType && !isValidTransactionType(row.TransactionType)) {
    errors.push(`Row ${rowIndex}: TransactionType must be 'snapshot' or 'contribution'`);
  }
  
  if (row.ContributionAmount && !isValidNumber(row.ContributionAmount)) {
    errors.push(`Row ${rowIndex}: ContributionAmount must be a valid number if provided`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const parseCSV = async (file: File): Promise<{
  success: boolean;
  data?: Omit<AssetEntry, 'id'>[];
  errors?: string[];
  warnings?: string[];
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check file size
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          errors.push('File size too large. Maximum size is 10MB.');
          resolve({ success: false, errors });
          return;
        }
        
        // Check if CSV has required headers
        const requiredHeaders = ['Date', 'Platform', 'Amount', 'Rate'];
        const missingHeaders = requiredHeaders.filter(header => 
          !results.meta.fields?.includes(header)
        );
        
        if (missingHeaders.length > 0) {
          errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
          resolve({ success: false, errors });
          return;
        }
        
        // Check for empty file
        if (data.length === 0) {
          errors.push('CSV file is empty or contains no valid data rows.');
          resolve({ success: false, errors });
          return;
        }
        
        // Check for reasonable row count
        if (data.length > 10000) {
          errors.push('Too many rows. Maximum is 10,000 entries.');
          resolve({ success: false, errors });
          return;
        }
        
        const validEntries: Omit<AssetEntry, 'id'>[] = [];
        let validRowCount = 0;
        
        data.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because index is 0-based and we skip header
          const validation = validateRow(row, rowNumber);
          
          errors.push(...validation.errors);
          warnings.push(...validation.warnings);
          
          if (validation.isValid) {
            validRowCount++;
            
            // Determine transaction type and data quality
            const hasContribution = row.ContributionAmount && parseFloat(row.ContributionAmount) > 0;
            const transactionType = row.TransactionType?.toLowerCase() as 'snapshot' | 'contribution' || 
                                  (hasContribution ? 'contribution' : 'snapshot');
            
            validEntries.push({
              date: row.Date.trim(),
              platform: row.Platform.trim(),
              amount: parseFloat(row.Amount),
              rate: parseFloat(row.Rate),
              transactionType,
              contributionAmount: hasContribution ? parseFloat(row.ContributionAmount!) : undefined,
              notes: row.Notes?.trim() || undefined,
              dataQuality: hasContribution ? 'enhanced' : 'snapshot_only'
            });
          }
        });
        
        const summary = {
          totalRows: data.length,
          validRows: validRowCount,
          invalidRows: data.length - validRowCount
        };
        
        // If we have some valid entries but also errors, it's a partial success
        if (validEntries.length > 0 && errors.length > 0) {
          resolve({ 
            success: true, 
            data: validEntries, 
            errors, 
            warnings, 
            summary 
          });
        } else if (errors.length > 0) {
          resolve({ success: false, errors, warnings, summary });
        } else {
          resolve({ success: true, data: validEntries, warnings, summary });
        }
      },
      error: (error) => {
        resolve({ 
          success: false, 
          errors: [`Failed to parse CSV file: ${error.message}`] 
        });
      }
    });
  });
};

export const importCSV = async (file: File): Promise<{
  success: boolean;
  message: string;
  count?: number;
  errors?: string[];
  warnings?: string[];
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}> => {
  try {
    const result = await parseCSV(file);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        message: 'Failed to parse CSV file.',
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary
      };
    }
    
    if (result.data.length === 0) {
      return {
        success: false,
        message: 'CSV file contains no valid entries.',
        count: 0,
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary
      };
    }
    
    // Import the valid entries
    await assetDb.addMultiple(result.data);
    
    // Create success message with details
    let message = `Successfully imported ${result.data.length} entries.`;
    
    if (result.summary) {
      const { totalRows, validRows, invalidRows } = result.summary;
      if (invalidRows > 0) {
        message += ` (${validRows} valid, ${invalidRows} skipped due to errors)`;
      }
    }
    
    // Add warnings summary if any
    if (result.warnings && result.warnings.length > 0) {
      message += ` Note: ${result.warnings.length} warnings found.`;
    }
    
    return {
      success: true,
      message,
      count: result.data.length,
      errors: result.errors,
      warnings: result.warnings,
      summary: result.summary
    };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

export const exportCSV = async (): Promise<{
  success: boolean;
  csvString?: string;
  filename?: string;
  message?: string;
}> => {
  try {
    const assets = await assetDb.getAll();
    
    if (assets.length === 0) {
      return {
        success: false,
        message: 'No data to export.'
      };
    }
    
    // Convert assets to CSV format
    const csvData = assets.map(asset => ({
      Date: asset.date,
      Platform: asset.platform,
      Amount: asset.amount.toString(),
      Rate: asset.rate.toString()
    }));
    
    const csvString = Papa.unparse(csvData);
    const filename = `homestead-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    return {
      success: true,
      csvString,
      filename
    };
  } catch (error) {
    return {
      success: false,
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const downloadCSV = (csvString: string, filename: string): void => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
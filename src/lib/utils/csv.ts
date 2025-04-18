import Papa from 'papaparse';
import type { AssetEntry } from '../db';
import { assetDb, ALLOWED_PLATFORMS } from '../db';

interface CSVRow {
  Date: string;
  Platform: string;
  Amount: string;
  Rate: string;
}

// Format validation functions
const isValidDate = (dateStr: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

const isValidNumber = (numStr: string): boolean => {
  return !isNaN(parseFloat(numStr));
};

const isValidPlatform = (platform: string): boolean => {
  return ALLOWED_PLATFORMS.includes(platform) || platform.trim() !== '';
};

export const parseCSV = async (file: File): Promise<{
  success: boolean;
  data?: Omit<AssetEntry, 'id'>[];
  errors?: string[];
}> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        const errors: string[] = [];
        
        // Check if CSV has required headers
        if (!results.meta.fields || 
            !results.meta.fields.includes('Date') || 
            !results.meta.fields.includes('Platform') || 
            !results.meta.fields.includes('Amount') || 
            !results.meta.fields.includes('Rate')) {
          errors.push('CSV file must include headers: Date, Platform, Amount, Rate');
          resolve({ success: false, errors });
          return;
        }
        
        const validEntries: Omit<AssetEntry, 'id'>[] = [];
        
        data.forEach((row, index) => {
          // Validate each row
          if (!isValidDate(row.Date)) {
            errors.push(`Row ${index + 2}: Invalid date format. Expected YYYY-MM-DD.`);
            return;
          }
          
          if (!isValidPlatform(row.Platform)) {
            errors.push(`Row ${index + 2}: Invalid platform.`);
            return;
          }
          
          if (!isValidNumber(row.Amount)) {
            errors.push(`Row ${index + 2}: Invalid amount.`);
            return;
          }
          
          if (!isValidNumber(row.Rate)) {
            errors.push(`Row ${index + 2}: Invalid rate.`);
            return;
          }
          
          validEntries.push({
            date: row.Date,
            platform: row.Platform,
            amount: parseFloat(row.Amount),
            rate: parseFloat(row.Rate)
          });
        });
        
        if (errors.length > 0) {
          resolve({ success: false, errors });
        } else {
          resolve({ success: true, data: validEntries });
        }
      },
      error: (error) => {
        resolve({ success: false, errors: [error.message] });
      }
    });
  });
};

export const importCSV = async (file: File): Promise<{
  success: boolean;
  message: string;
  count?: number;
  errors?: string[];
}> => {
  try {
    const result = await parseCSV(file);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        message: 'Failed to parse CSV file.',
        errors: result.errors
      };
    }
    
    if (result.data.length === 0) {
      return {
        success: false,
        message: 'CSV file contains no valid entries.',
        count: 0
      };
    }
    
    await assetDb.addMultiple(result.data);
    
    return {
      success: true,
      message: `Successfully imported ${result.data.length} entries.`,
      count: result.data.length
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
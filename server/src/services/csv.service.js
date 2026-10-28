import { Readable } from 'stream';
import csvParser from 'csv-parser';

/**
 * Service to parse, validate, and infer schema from uploaded CSV buffers.
 */
export class CsvService {
  /**
   * Parse CSV Buffer into sanitized headers and array of typed rows.
   * @param {Buffer} buffer - CSV file buffer
   * @param {number} maxRows - Maximum allowed rows
   * @returns {Promise<{ headers: string[], rows: Array<Record<string, any>>, rawRowCount: number }>}
   */
  static async parseCsvBuffer(buffer, maxRows = 10000) {
    if (!buffer || buffer.length === 0) {
      const error = new Error('The uploaded CSV file is empty.');
      error.code = 'EMPTY_FILE';
      throw error;
    }

    return new Promise((resolve, reject) => {
      const rows = [];
      let headers = [];
      let rawRowCount = 0;
      let limitExceeded = false;

      const stream = Readable.from(buffer);

      stream
        .pipe(
          csvParser({
            mapHeaders: ({ header, index }) => {
              // Strip UTF-8 BOM, trim whitespace
              let clean = header ? header.replace(/^\uFEFF/, '').trim() : '';
              if (!clean) {
                clean = `Column_${index + 1}`;
              }
              return clean;
            },
            skipLinesWithError: false
          })
        )
        .on('headers', rawHeaders => {
          // Detect and disambiguate duplicate headers
          const seen = new Map();
          headers = rawHeaders.map((h, idx) => {
            let name = h || `Column_${idx + 1}`;
            if (seen.has(name)) {
              const count = seen.get(name) + 1;
              seen.set(name, count);
              return `${name}_${count}`;
            } else {
              seen.set(name, 1);
              return name;
            }
          });
        })
        .on('data', data => {
          rawRowCount++;
          if (rawRowCount > maxRows) {
            limitExceeded = true;
            return;
          }

          // Clean empty string keys and trim string values
          const cleanRow = {};
          for (const header of headers) {
            const val = data[header];
            if (val === undefined || val === null || val === '') {
              cleanRow[header] = null;
            } else if (typeof val === 'string') {
              cleanRow[header] = val.trim();
            } else {
              cleanRow[header] = val;
            }
          }
          rows.push(cleanRow);
        })
        .on('end', () => {
          if (headers.length === 0 || rows.length === 0) {
            const error = new Error('CSV file must contain valid headers and at least one data row.');
            error.code = 'INVALID_CSV_CONTENT';
            return reject(error);
          }

          if (limitExceeded) {
            const error = new Error(
              `Dataset exceeds maximum supported limit of ${maxRows.toLocaleString()} rows. Please upload a smaller file.`
            );
            error.code = 'ROW_LIMIT_EXCEEDED';
            return reject(error);
          }

          resolve({ headers, rows, rawRowCount });
        })
        .on('error', err => {
          const error = new Error(`CSV parsing error: ${err.message}`);
          error.code = 'CSV_PARSE_FAILED';
          reject(error);
        });
    });
  }

  /**
   * Infer column types and calculate initial summary metrics.
   * @param {string[]} headers
   * @param {Array<Record<string, any>>} rows
   * @returns {Array<object>} Schema info array
   */
  static inferSchema(headers, rows) {
    const totalRows = rows.length;

    return headers.map(column => {
      let nonNullCount = 0;
      let missingCount = 0;
      let numericCount = 0;
      let dateCount = 0;
      let booleanCount = 0;

      const sampleValues = [];
      const uniqueValues = new Set();
      const numericValues = [];

      for (let i = 0; i < totalRows; i++) {
        const raw = rows[i][column];

        if (raw === null || raw === undefined || raw === '') {
          missingCount++;
          continue;
        }

        nonNullCount++;
        const strVal = String(raw).trim();

        if (sampleValues.length < 5 && !sampleValues.includes(strVal)) {
          sampleValues.push(strVal);
        }

        if (uniqueValues.size < 500) {
          uniqueValues.add(strVal);
        }

        // Check Boolean
        const lower = strVal.toLowerCase();
        if (['true', 'false', 'yes', 'no'].includes(lower)) {
          booleanCount++;
        }

        // Check Numeric (exclude empty and strict non-numeric)
        const num = Number(strVal);
        if (!isNaN(num) && isFinite(num) && strVal !== '') {
          numericCount++;
          numericValues.push(num);
        } else {
          // Check Date only if not purely numeric (prevent '2020' being just a date when it could be numeric)
          if (isNaN(num)) {
            const parsedDate = Date.parse(strVal);
            // Must have year-like or separator pattern to avoid arbitrary words parsing as dates
            const hasDateSeparators = /[-/:]/.test(strVal) || /^\d{4}/.test(strVal);
            if (!isNaN(parsedDate) && hasDateSeparators) {
              dateCount++;
            }
          }
        }
      }

      // Determine inferred type by predominance threshold (> 80% of non-null values)
      let type = 'string';
      const threshold = nonNullCount > 0 ? 0.8 : 1.0;

      if (nonNullCount > 0) {
        if (numericCount / nonNullCount >= threshold) {
          type = 'numeric';
        } else if (dateCount / nonNullCount >= threshold) {
          type = 'date';
        } else if (booleanCount / nonNullCount >= threshold) {
          type = 'boolean';
        }
      }

      // Convert rows to parsed values if type is numeric or boolean
      if (type === 'numeric') {
        numericValues.sort((a, b) => a - b);
        const min = numericValues.length > 0 ? numericValues[0] : null;
        const max = numericValues.length > 0 ? numericValues[numericValues.length - 1] : null;
        const sum = numericValues.reduce((acc, v) => acc + v, 0);
        const mean = numericValues.length > 0 ? Number((sum / numericValues.length).toFixed(4)) : null;

        let median = null;
        if (numericValues.length > 0) {
          const mid = Math.floor(numericValues.length / 2);
          median =
            numericValues.length % 2 !== 0
              ? numericValues[mid]
              : Number(((numericValues[mid - 1] + numericValues[mid]) / 2).toFixed(4));
        }

        return {
          name: column,
          type,
          sampleValues,
          uniqueCount: uniqueValues.size,
          missingCount,
          isConstant: uniqueValues.size <= 1 && nonNullCount > 0,
          min,
          max,
          mean,
          median
        };
      }

      return {
        name: column,
        type,
        sampleValues,
        uniqueCount: uniqueValues.size,
        missingCount,
        isConstant: uniqueValues.size <= 1 && nonNullCount > 0,
        min: null,
        max: null,
        mean: null,
        median: null
      };
    });
  }

  /**
   * Convert row values according to inferred schema.
   * @param {Array<Record<string, any>>} rows
   * @param {Array<object>} schemaInfo
   * @returns {Array<Record<string, any>>}
   */
  static castRowValues(rows, schemaInfo) {
    const typeMap = new Map(schemaInfo.map(c => [c.name, c.type]));

    return rows.map(row => {
      const typedRow = {};
      for (const [col, val] of Object.entries(row)) {
        if (val === null || val === undefined || val === '') {
          typedRow[col] = null;
          continue;
        }

        const type = typeMap.get(col) || 'string';
        if (type === 'numeric') {
          const num = Number(val);
          typedRow[col] = isNaN(num) ? null : num;
        } else if (type === 'boolean') {
          const lower = String(val).toLowerCase();
          typedRow[col] = lower === 'true' || lower === 'yes' || lower === '1';
        } else {
          typedRow[col] = String(val);
        }
      }
      return typedRow;
    });
  }
}

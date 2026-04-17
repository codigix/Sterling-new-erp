import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Loader } from 'lucide-react';

const DataTable = ({
  columns,
  data,
  loading = false,
  error = null,
  emptyMessage = 'No data found',
  onRowClick = null,
  sortable = true,
  striped = true,
  hover = true,
}) => {
  const [sortConfig, setSortConfig] = useState(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };



  const getSortIcon = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 inline" />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-xs justify-center py-12">
        <div className="text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Error
          </p>
          <p className="text-xs text-red-500 dark:text-red-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="flex items-center text-xs justify-center py-12">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (!Array.isArray(sortedData)) {
    console.error("DataTable error: sortedData is not an array", sortedData);
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 rounded border border-red-200">
        Error: Unable to display data table. Expected an array but received {typeof sortedData}.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`p-2  text-xs  text-slate-700 dark:text-slate-300 ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                } ${
                  column.sortable !== false && sortable
                    ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 select-none'
                    : ''
                }`}
                onClick={() =>
                  column.sortable !== false && sortable && handleSort(column.key)
                }
              >
                <div className={`flex items-center text-xs ${column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                  {column.label}
                  {column.sortable !== false && sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className={`border-b border-slate-200 dark:border-slate-700 ${
                striped && rowIndex % 2 === 1
                  ? 'bg-slate-50 dark:bg-slate-800/30'
                  : ''
              } ${
                hover
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50 transition'
                  : ''
              } ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={`${row.id || rowIndex}-${column.key}`}
                  className={`p-2 text-xs font-thin ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.render ? (
                    column.render(row[column.key], row)
                  ) : (
                    <span>
                      {row[column.key] ?? '-'}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

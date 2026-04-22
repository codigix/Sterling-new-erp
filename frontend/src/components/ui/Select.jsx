import React from "react";
import SearchableSelect from "./SearchableSelect";

const Select = ({
  label,
  error,
  helperText,
  options = [],
  className = "",
  containerClassName = "",
  size = "default",
  disabled = false,
  onChange,
  value,
  placeholder,
  children,
  ...props
}) => {
  // If children (options) are provided, we need to extract them for SearchableSelect
  const extractedOptions = React.useMemo(() => {
    if (options && options.length > 0) return options;
    
    if (children) {
      return React.Children.map(children, child => {
        if (child && child.type === 'option') {
          return {
            label: child.props.children,
            value: child.props.value
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    return [];
  }, [options, children]);

  const handleSearchableChange = (newValue) => {
    if (onChange) {
      // Create a mock event for backward compatibility if needed
      const event = {
        target: {
          value: newValue,
          name: props.name
        }
      };
      onChange(event);
    }
  };

  return (
    <div className={`space-y-2  ${containerClassName}`}>
      <SearchableSelect
        label={label}
        options={extractedOptions}
        value={value}
        onChange={handleSearchableChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        className={className}
        name={props.name}
        id={props.id}
      />
      {helperText && !error && (
        <p className="text-sm text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export default Select;

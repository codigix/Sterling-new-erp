import React from 'react';

const Badge = ({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center';

  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-50 text-primary-700',
    secondary: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-cyan-50 text-cyan-700',
    gray: 'bg-slate-50 text-slate-500'
  };

  const sizes = {
    xs: 'p-1 text-xs rounded',
    sm: 'p-1 text-xs rounded ',
    default: 'p-2 text-xs rounded',
    lg: 'p-1 text-xs rounded '
  };

  const variantClasses = !className ? variants[variant] : '';
  const classes = `${baseClasses} ${variantClasses} ${sizes[size]} ${className}`;

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
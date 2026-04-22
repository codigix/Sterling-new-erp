import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 'default',
  shadow = 'sm',
  ...props
}) => {
  const baseClasses = 'bg-white rounded transition-shadow border border-gray-200 duration-200';

  const shadows = {
    none: '',
    xs: 'shadow-xs',
    sm: '',
    md: ' ',
    lg: 'shadow-lg hover:',
  };

  const paddings = {
    none: '',
    sm: 'p-2',
    default: 'p-2',
    lg: 'p-2'
  };

  const classes = `${baseClasses} ${shadows[shadow]} ${paddings[padding]} ${className}`;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => (
  <div className={` pb-2 border-b border-slate-200 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-md   ${className}`} {...props}>
    {children}
  </h3>
);

const CardSubtitle = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-slate-500 mt-1 text-left ${className}`} {...props}>
    {children}
  </p>
);

const CardContent = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`mt-4 pt-4 border-t border-slate-200 ${className}`} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter };
export default Card;

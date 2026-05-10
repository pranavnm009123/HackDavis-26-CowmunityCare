import React from 'react';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Button({ className = '', variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cx('cc-button', `cc-button-${variant}`, `cc-button-${size}`, className)}
      {...props}
    />
  );
}

export function Card({ className = '', ...props }) {
  return <section className={cx('cc-card', className)} {...props} />;
}

export function CardHeader({ className = '', ...props }) {
  return <div className={cx('cc-card-header', className)} {...props} />;
}

export function CardTitle({ className = '', ...props }) {
  return <h2 className={cx('cc-card-title', className)} {...props} />;
}

export function CardDescription({ className = '', ...props }) {
  return <p className={cx('cc-card-description', className)} {...props} />;
}

export function CardContent({ className = '', ...props }) {
  return <div className={cx('cc-card-content', className)} {...props} />;
}

export function Badge({ className = '', variant = 'secondary', ...props }) {
  return <span className={cx('cc-badge', `cc-badge-${variant}`, className)} {...props} />;
}

export function Input({ className = '', ...props }) {
  return <input className={cx('cc-input', className)} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={cx('cc-input', className)} {...props} />;
}

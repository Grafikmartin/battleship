import React from 'react';

interface StatusMessageProps {
  message: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  return (
    <div className="status-message">
      <p>{message}</p>
    </div>
  );
};

export default StatusMessage;
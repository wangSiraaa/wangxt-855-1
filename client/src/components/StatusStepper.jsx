import React from 'react';
import { Steps, Tag } from 'antd';
import { STEPS, getStatusStep, getStatusLabel, getStatusColor } from '../utils/constants';

export default function StatusStepper({ status }) {
  const currentStep = getStatusStep(status);
  
  return (
    <div className="stepper-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500, marginRight: 12 }}>当前状态:</span>
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      </div>
      <Steps
        current={currentStep}
        items={STEPS.map((step, index) => ({
          title: step.title,
          description: step.description
        }))}
      />
    </div>
  );
}

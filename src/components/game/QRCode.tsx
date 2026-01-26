import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCode({ value, size = 200 }: QRCodeProps) {
  return (
    <div className="bg-white p-4 rounded-lg inline-block">
      <QRCodeSVG 
        value={value} 
        size={size}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}

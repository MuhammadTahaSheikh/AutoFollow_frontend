import Image from 'next/image';
import { APP_NAME, COMPANY_NAME } from '@/lib/brand';

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  showText?: boolean;
  variant?: 'short' | 'full';
  textClassName?: string;
};

export default function Logo({
  size = 'sm',
  showText = true,
  variant = 'short',
  textClassName = '',
}: LogoProps) {
  const px = SIZES[size];
  const label = variant === 'full' ? APP_NAME : COMPANY_NAME;

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt={`${COMPANY_NAME} logo`}
        width={px}
        height={px}
        className="rounded-lg shrink-0"
        priority
      />
      {showText && (
        <span className={`font-semibold ${textClassName}`}>{label}</span>
      )}
    </div>
  );
}

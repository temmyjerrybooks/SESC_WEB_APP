import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  return (
    <Link aria-label="Super Eagles Supporters Club home" className={`brand-mark ${className}`} href="/">
      <span aria-hidden="true" className="brand-mark__crest">
        <span>SESC</span>
      </span>
      {!compact && (
        <span className="brand-mark__wordmark">
          <strong>Super Eagles</strong>
          <small>Supporters Club of Nigeria</small>
        </span>
      )}
    </Link>
  );
}

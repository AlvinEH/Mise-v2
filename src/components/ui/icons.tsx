interface ZzzProps {
  size?: number;
  className?: string;
}

export const Zzz = ({ size = 24, className = "" }: ZzzProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`lucide lucide-zzz ${className}`}
  >
    <path d="M4 7h7l-7 10h8"/>
    <path d="M11 3h7l-7 10h8"/>
    <path d="M15 14h4l-4 6h5"/>
  </svg>
);
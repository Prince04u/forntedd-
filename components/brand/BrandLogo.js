import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export { BRAND_LOGO_SRC, BRAND_NAME };
const SIZE_MAP = {
  sm: { shell: "brand-logo-shell-sm", width: 117, height: 32 },
  md: { shell: "brand-logo-shell-md", width: 147, height: 40 },
  lg: { shell: "brand-logo-shell-lg", width: 184, height: 50 },
};

export default function BrandLogo({
  href,
  size = "md",
  className = "",
  priority = false,
}) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;
  const content = (
    <span className={`brand-logo-shell ${config.shell} ${className}`.trim()}>
      <Image
        src={BRAND_LOGO_SRC}
        alt={BRAND_NAME}
        width={config.width}
        height={config.height}
        className="brand-logo-img"
        priority={priority}
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="brand-logo-link" aria-label={`${BRAND_NAME} home`}>
        {content}
      </Link>
    );
  }

  return content;
}

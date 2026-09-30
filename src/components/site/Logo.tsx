import logo from "@/assets/logo-jc.png.asset.json";

export function Logo({ className = "h-12" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Janaína Cunha Studio"
      loading="eager"
      className={`${className} w-auto object-contain`}
    />
  );
}

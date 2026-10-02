export function Logo({ className = "h-12" }: { className?: string }) {
  return (
    <img
      src="/logo-jc.png"
      alt="Janaína Cunha Studio"
      loading="eager"
      className={`${className} w-auto object-contain`}
    />
  );
}

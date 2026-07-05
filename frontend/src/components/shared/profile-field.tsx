export  function ProfileField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  const isEmpty = !value.trim();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-muted font-body text-sm">{label}</span>
      <p
        className={[
          "font-body text-sm",
          isEmpty ? "text-text-subtle italic" : "text-text",
        ].join(" ")}
      >
        {isEmpty ? placeholder ?? "Not set" : value}
      </p>
    </div>
  );
}
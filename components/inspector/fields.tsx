'use client';

type FieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
};

function fieldStateClass(invalid: boolean) {
  return invalid ? 'border-red-500 outline outline-2 outline-red-500' : '';
}

export function Field({ label, value, onChange, required = false, invalid = false }: FieldProps) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required ? ' *' : ''}
      <input
        className={`mt-1 w-full rounded border p-2 ${fieldStateClass(invalid)}`}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Area({ label, value, onChange, required = false, invalid = false }: FieldProps) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required ? ' *' : ''}
      <textarea
        className={`mt-1 w-full rounded border p-2 ${fieldStateClass(invalid)}`}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className="mt-1 w-full rounded border p-2"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

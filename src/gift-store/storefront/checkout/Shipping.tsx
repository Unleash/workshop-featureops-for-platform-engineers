import type { ShippingAddress } from '@gift-store/commerce';

interface ShippingProps {
  value: ShippingAddress;
  onChange: (value: ShippingAddress) => void;
}

const FIELDS: { key: keyof ShippingAddress; label: string }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'line1', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'country', label: 'Country' },
];

/** Shipping is pre-filled (this is a demo) but stays editable. */
export const Shipping = ({ value, onChange }: ShippingProps) => (
  <div className="grid grid-cols-2 gap-3">
    {FIELDS.map((field) => (
      <label
        key={field.key}
        className={field.key === 'fullName' || field.key === 'line1' ? 'col-span-2' : ''}
      >
        <span className="text-sm font-semibold text-slate-600">{field.label}</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
          value={value[field.key] ?? ''}
          onChange={(event) => {
            onChange({ ...value, [field.key]: event.target.value });
          }}
        />
      </label>
    ))}
  </div>
);

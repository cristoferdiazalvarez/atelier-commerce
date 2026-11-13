import type { Address } from '@prisma/client';
export function AddressFields({ address }: { address?: Address }) {
  return (
    <>
      <input type="hidden" name="id" value={address?.id || ''} />
      <label>
        Nombre
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={address?.name}
          autoComplete="name"
        />
      </label>
      <label>
        Dirección
        <input
          name="line1"
          required
          minLength={3}
          maxLength={200}
          defaultValue={address?.line1}
          autoComplete="street-address"
        />
      </label>
      <div className="form-row">
        <label>
          Ciudad
          <input
            name="city"
            required
            minLength={2}
            maxLength={100}
            defaultValue={address?.city}
            autoComplete="address-level2"
          />
        </label>
        <label>
          Código postal
          <input
            name="postalCode"
            required
            minLength={3}
            maxLength={15}
            defaultValue={address?.postalCode}
            autoComplete="postal-code"
          />
        </label>
      </div>
      <label>
        País
        <select name="country" defaultValue={address?.country || 'ES'} autoComplete="country">
          <option value="ES">España</option>
          <option value="PT">Portugal</option>
          <option value="FR">Francia</option>
        </select>
      </label>
    </>
  );
}

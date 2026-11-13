import type { ProductImage, Variant, Category, Collection, Coupon } from '@prisma/client';
import { ActionForm } from './forms';
export function VariantEditor({ variant }: { variant: Variant }) {
  return (
    <details>
      <summary>Editar {variant.sku}</summary>
      <ActionForm endpoint="admin/variant" transform="numeric">
        <input type="hidden" name="id" value={variant.id} />
        <input type="hidden" name="productId" value={variant.productId} />
        <label>
          SKU
          <input name="sku" defaultValue={variant.sku} required />
        </label>
        <label>
          Talla
          <input name="size" defaultValue={variant.size} required />
        </label>
        <label>
          Color
          <input name="color" defaultValue={variant.color} required />
        </label>
        <label>
          Disponible en tienda
          <select name="active" defaultValue={String(variant.active)}>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </ActionForm>
      <p className="muted">
        El stock se modifica con movimientos de inventario. Las variantes con historial se
        desactivan.
      </p>
      <ActionForm endpoint="admin/variant-delete" button="Eliminar variante sin historial">
        <input type="hidden" name="id" value={variant.id} />
      </ActionForm>
    </details>
  );
}
export function ImageEditor({ image }: { image: ProductImage }) {
  return (
    <details>
      <summary>
        Imagen {image.position} · {image.alt}
      </summary>
      <ActionForm endpoint="admin/image" transform="numeric">
        <input type="hidden" name="id" value={image.id} />
        <input type="hidden" name="productId" value={image.productId} />
        <label>
          URL de imagen
          <input name="url" defaultValue={image.url} required />
        </label>
        <label>
          Texto alternativo
          <input name="alt" defaultValue={image.alt} required />
        </label>
        <label>
          Posición
          <input name="position" type="number" min="0" max="100" defaultValue={image.position} />
        </label>
      </ActionForm>
      <ActionForm endpoint="admin/image-delete" button="Eliminar imagen">
        <input type="hidden" name="id" value={image.id} />
      </ActionForm>
    </details>
  );
}
export function TaxonomyEditor({
  type,
  rows,
}: {
  type: 'category' | 'collection';
  rows: (Category | Collection)[];
}) {
  return (
    <div>
      <h3>{type === 'category' ? 'Categorías' : 'Colecciones'}</h3>
      {rows.map((row) => (
        <details key={row.id}>
          <summary>{row.name}</summary>
          <ActionForm endpoint={`admin/${type}`}>
            <input type="hidden" name="id" value={row.id} />
            <label>
              Nombre
              <input name="name" defaultValue={row.name} required />
            </label>
            <label>
              Slug
              <input name="slug" defaultValue={row.slug} required pattern="[a-z0-9-]+" />
            </label>
          </ActionForm>
          <ActionForm endpoint={`admin/${type}-delete`} button="Eliminar agrupación vacía">
            <input type="hidden" name="id" value={row.id} />
          </ActionForm>
        </details>
      ))}
      <h3>Crear {type === 'category' ? 'categoría' : 'colección'}</h3>
      <ActionForm endpoint={`admin/${type}`}>
        <label>
          Nombre
          <input name="name" required />
        </label>
        <label>
          Slug
          <input name="slug" required pattern="[a-z0-9-]+" />
        </label>
      </ActionForm>
    </div>
  );
}
export function CouponEditor({ coupon }: { coupon?: Coupon }) {
  return (
    <ActionForm endpoint="admin/coupon" transform="numeric">
      <input type="hidden" name="id" value={coupon?.id || ''} />
      <label>
        Código
        <input name="code" defaultValue={coupon?.code} required minLength={3} />
      </label>
      <label>
        Descuento %
        <input
          name="percent"
          type="number"
          min="1"
          max="70"
          required
          defaultValue={coupon?.percent}
        />
      </label>
      <label>
        Activo
        <select name="active" defaultValue={String(coupon?.active ?? true)}>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </label>
      <label>
        Caducidad (UTC, opcional)
        <input
          name="expiresAt"
          type="datetime-local"
          defaultValue={coupon?.expiresAt?.toISOString().slice(0, 16) || ''}
        />
      </label>
    </ActionForm>
  );
}

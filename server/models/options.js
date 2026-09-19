// ---------------------------------------------------------------------------
// Shared Mongoose schema options.
//
// The frontend was written against Supabase/PostgREST, so the JSON this API
// returns keeps that exact shape: snake_case columns, a string `id` instead of
// `_id`, and no `__v`. That way the pages and components did not have to change
// when the backend moved to MongoDB.
// ---------------------------------------------------------------------------

/** toJSON config: expose `id`, hide `_id`/`__v`, include populate virtuals. */
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id
    return ret
  },
}

/** Options for collections that track both created_at and updated_at. */
export const timestamped = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON,
  toObject: toJSON,
}

/** Options for collections that only track created_at (join/lookup tables). */
export const createdOnly = {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON,
  toObject: toJSON,
}

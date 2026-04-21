-- Switch the default accent for new user_settings rows to the Instagram gradient.
-- The Efi brand accent remains available as a user-selectable option but was too
-- saturated as the product-wide default. Existing rows are untouched.
ALTER TABLE user_settings
  ALTER COLUMN accent_color SET DEFAULT 'gradient:instagram';

CREATE TABLE IF NOT EXISTS roles (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO roles(name) VALUES ('admin'), ('customer'), ('artisan')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS permissions (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS roles_permissions (
	"ID_role" INTEGER REFERENCES roles("ID"),
	"ID_permission" INTEGER REFERENCES permissions("ID"),
	PRIMARY KEY("ID_role", "ID_permission")
);

CREATE TABLE IF NOT EXISTS images (
	"ID" SERIAL PRIMARY KEY,
	url VARCHAR(255) UNIQUE NOT NULL,
	timestamp_upload TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
	"ID" SERIAL PRIMARY KEY,
	email VARCHAR(100) UNIQUE NOT NULL,
	name VARCHAR(100) NOT NULL,
	surname VARCHAR(100) NOT NULL,
	password CHAR(255) NOT NULL,
	id_role INTEGER NOT NULL REFERENCES roles("ID"),
	timestamp_registration TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	id_profile_picture INTEGER REFERENCES images("ID"),
	bio VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS artisan_reviews (
	"ID" SERIAL PRIMARY KEY,
	id_artisan INTEGER NOT NULL REFERENCES users("ID"),
	id_reviewer INTEGER NOT NULL REFERENCES users("ID"),
	rating INTEGER NOT NULL,
	review_text VARCHAR(1024),
	timestamp_review TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	slug VARCHAR(200) UNIQUE NOT NULL,
	description TEXT NOT NULL,
	short_description VARCHAR(255) NOT NULL,
	price INTEGER NOT NULL,
	timestamp_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	timestamp_last_update TIMESTAMP NOT NULL,
	removed BOOLEAN NOT NULL DEFAULT FALSE,
	artisan INTEGER NOT NULL REFERENCES users("ID")
);

CREATE TABLE IF NOT EXISTS categories (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL,
	slug VARCHAR(200) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS product_categories (
	"ID_category" INTEGER REFERENCES categories("ID"),
	"ID_product" INTEGER REFERENCES products("ID"),
	PRIMARY KEY ("ID_category", "ID_product")
);

CREATE TABLE IF NOT EXISTS product_images (
	"ID_product" INTEGER REFERENCES products("ID"),
	"ID_image" INTEGER REFERENCES images("ID"),
	position INTEGER,
	PRIMARY KEY ("ID_product", "ID_image", position)
);

CREATE TABLE IF NOT EXISTS product_visits (
	"ID_product" INTEGER REFERENCES products("ID"),
	timestamp_visit TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	id_user INTEGER NOT NULL REFERENCES users("ID"),
	ip_address INET NOT NULL,
	PRIMARY KEY("ID_product", timestamp_visit)
);

CREATE TABLE IF NOT EXISTS products_restock (
	"ID_product" INTEGER REFERENCES products("ID"),
	timestamp_restock TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	quantity INTEGER NOT NULL,
	PRIMARY KEY("ID_product", timestamp_restock)
);

CREATE TABLE IF NOT EXISTS ticket_status (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO ticket_status(name) VALUES ('Aperto'), ('Chiuso')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS ticket_products (
	"ID" SERIAL PRIMARY KEY,
	id_product INTEGER NOT NULL REFERENCES products("ID"),
	id_user INTEGER NOT NULL REFERENCES users("ID"),
	timestamp_open TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	timestamp_resolved TIMESTAMP,
	status INTEGER NOT NULL REFERENCES ticket_status("ID"),
	note TEXT NOT NULL,
	id_admin INTEGER REFERENCES users("ID")
);

CREATE TABLE IF NOT EXISTS products_carts (
	"ID_product" INTEGER,
	"ID_user" INTEGER,
	quantity INTEGER NOT NULL,
	timestamp_item_added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("ID_product", "ID_user")
);

CREATE TABLE IF NOT EXISTS order_status (
	"ID" SERIAL PRIMARY KEY,
	name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO order_status(name) VALUES ('Pagato'), ('Spedito'), ('Consegnato'), ('Annullato'), ('Rimborsato')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
	"ID" SERIAL PRIMARY KEY,
	id_user INTEGER REFERENCES users("ID"),
	status INTEGER REFERENCES order_status("ID"),
	timestamp_order TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	payment_intent VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS products_order (
	"ID_order" INTEGER REFERENCES orders("ID"),
	"ID_product" INTEGER REFERENCES products("ID"),
	quantity INTEGER NOT NULL,
	single_product_price INTEGER NOT NULL,
	refunded_import INTEGER
);

CREATE TABLE IF NOT EXISTS ticket_orders (
	"ID" SERIAL PRIMARY KEY,
	id_order INTEGER NOT NULL REFERENCES orders("ID"),
	id_user INTEGER NOT NULL REFERENCES users("ID"),
	timestamp_open TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	timestamp_resolved TIMESTAMP,
	status INTEGER REFERENCES ticket_status("ID"),
	note TEXT NOT NULL,
	id_admin INTEGER REFERENCES users("ID")
);
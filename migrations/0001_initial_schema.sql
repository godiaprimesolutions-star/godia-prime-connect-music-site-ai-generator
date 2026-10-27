PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS song_requests (
    id TEXT PRIMARY KEY,
    customer_phone TEXT NOT NULL,
    song_title TEXT NOT NULL,
    lyrics TEXT NOT NULL,
    music_style TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'payment_pending'
        CHECK (status IN (
            'payment_pending',
            'paid',
            'generating',
            'ready',
            'failed'
        )),
    generation_amount_kes INTEGER NOT NULL DEFAULT 250
        CHECK (generation_amount_kes >= 0),
    audio_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    song_request_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
    payment_type TEXT NOT NULL
        CHECK (payment_type IN ('generation', 'download')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'confirmed',
            'failed',
            'cancelled'
        )),
    merchant_request_id TEXT,
    checkout_request_id TEXT,
    mpesa_receipt_number TEXT UNIQUE,
    result_code TEXT,
    result_description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_request_id)
        REFERENCES song_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_song_requests_phone
    ON song_requests(customer_phone);

CREATE INDEX IF NOT EXISTS idx_song_requests_status
    ON song_requests(status);

CREATE INDEX IF NOT EXISTS idx_payments_song_request
    ON payments(song_request_id);

CREATE INDEX IF NOT EXISTS idx_payments_checkout
    ON payments(checkout_request_id);

CREATE TABLE IF NOT EXISTS download_permissions (
    id TEXT PRIMARY KEY,
    song_request_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    amount_kes INTEGER NOT NULL DEFAULT 50
        CHECK (amount_kes > 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'revoked')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_request_id)
        REFERENCES song_requests(id),
    FOREIGN KEY (payment_id)
        REFERENCES payments(id),
    UNIQUE (song_request_id, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_download_permissions_song
    ON download_permissions(song_request_id);

CREATE INDEX IF NOT EXISTS idx_download_permissions_status
    ON download_permissions(status);

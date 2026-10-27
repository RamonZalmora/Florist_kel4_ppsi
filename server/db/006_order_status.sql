-- Keep legacy cancellations as historical records. Processing orders are unfinished.
UPDATE orders SET status='pending' WHERE status='processing';

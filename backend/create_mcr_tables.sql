CREATE TABLE IF NOT EXISTS material_cutting_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    work_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES daily_production_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_cutting_report_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mcr_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    design VARCHAR(50) DEFAULT 'Rectangular',
    produced_qty INT DEFAULT 1,
    cutting_axis VARCHAR(10) DEFAULT 'L',
    raw_l DECIMAL(10,2),
    raw_w DECIMAL(10,2),
    raw_t DECIMAL(10,2),
    new_l DECIMAL(10,2),
    new_w DECIMAL(10,2),
    new_t DECIMAL(10,2),
    weight_consumed DECIMAL(10,3),
    scrap_weight DECIMAL(10,3),
    is_finished BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    FOREIGN KEY (mcr_id) REFERENCES material_cutting_reports(id) ON DELETE CASCADE
);
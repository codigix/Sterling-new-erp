CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Insert default permissions
INSERT IGNORE INTO permissions (id, name, description) VALUES
(1, 'Manage Users', 'Create, edit, delete users'),
(2, 'Manage Roles', 'Create and manage system roles'),
(3, 'View Reports', 'Access all reports'),
(4, 'Edit Projects', 'Create and edit projects'),
(5, 'View Dashboard', 'Access dashboard'),
(6, 'Submit Tasks', 'Submit tasks and updates'),
(7, 'System Settings', 'Configure system settings'),
(8, 'Audit Logs', 'View system audit logs');

-- Insert default roles
INSERT IGNORE INTO roles (id, name, description) VALUES
(1, 'Admin', 'System Administrator with full access'),
(2, 'Employee', 'Standard employee role'),
(3, 'Manager', 'Managerial role with elevated permissions');

-- Assign permissions to Admin (all permissions)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign some permissions to Manager
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions 
WHERE name IN ('View Reports', 'Edit Projects', 'View Dashboard', 'Submit Tasks');

-- Assign some permissions to Employee
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE name IN ('View Dashboard', 'Submit Tasks');

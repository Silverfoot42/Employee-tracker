SELECT role.id, role.title, department.name AS department, role.salary
FROM role
JOIN department ON role.department_id
ORDER BY department.id;
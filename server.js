const mysql = require('mysql2');
const inquirer = require('inquirer');

const db = mysql.createConnection(
  {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'employee_db'
  },
  () => {
    console.log(`Connected to the employee database.`)
    menu();
  });

const menu = async () => {
  const selection = await inquirer.prompt([
    {
      type: 'list',
      name: 'options',
      message: 'What would you like to do?',
      choices: ['View all departments', 'View all roles', 'View all employees', 'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', 'Quit']
    }
  ]);

  if(selection.options === 'View all departments') {
    db.query('SELECT * FROM department', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'View all roles') {
    db.query('SELECT roles.id, roles.title, department.department_name AS department, roles.salary FROM roles JOIN department ON role.department_id = department.id ORDER BY department.id', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'View all employees') {
    db.query('SELECT employees.id, employees.first_name, employees.last_name, roles.title, department.department_name AS department, roles.salary, CONCAT(manager.first_name, \' \', manager.last_name) AS manager_name FROM employees JOIN roles ON employees.role_id = roles.id JOIN department ON roles.department_id = department.id LEFT JOIN employees manager ON employees.manager_id = manager.id ORDER BY employees.id', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'Add a department') {
    inquirer.prompt([
      {
        type: 'input',
        name: 'department',
        message: 'Enter the name of the department to be added:',
      },
    ])
    .then((answers) => {
      const departmentName = answers.department;
      const values = [departmentName];
      
      db.query('INSERT INTO department (department_name) VALUES (?)', values, (err, results) => {
        if(err) {
          console.error('Error adding department:', err);
        } else {
          console.log('Department added successfully!');
          menu();
        }   
      });
    })
  } else if (selection.options === 'Add a role') {
    inquirer.prompt([
      {
        type: 'input',
        name: 'role',
        message: 'Enter the name of the role to be added:',
      },
      {
        type: 'input',
        name: 'salary',
        message: 'Enter the salary for this role:',
      },
      {
        type: 'list',
        name: 'department',
        message: 'Select the department this role belongs to',
        choices: getDepartmentChoices(),
      },
    ])
    .then((answers) => {
      const roleName = answers.role;
      const salary = answers.salary;
      const depatmentName = answers.department;
      const values = [roleName, salary, depatmentName];

      db.query('INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)', values, (err, results) => {
        if (err) {
          console.error('Error adding role:', err);
        } else {
          console.log('Role added successfully!');
          menu();
        }
      });
    });
  } else if (selection.options === 'Add an employee') {
    inquirer.prompt([
      {
        type: 'input',
        name: 'first',
        message: 'Enter the employee\'s first name:',
      },
      {
        type: 'input',
        name: 'last',
        message: 'Enter the employee\'s last name:',
      },
      {
        type: 'input',
        name: 'role',
        message: 'Select the employess\'s role:',
        choices: getRoleChoices(),
      },
      {
        type: 'list',
        name: 'manager',
        message: 'Who is this employees manager?',
        choices: getManagerChoices(),
      },
    ])
    .then((answers) => {
      const firstName = answers.first;
      const lastName = answers.last;
      const role = answers.role;
      const manager = answers.manager;
      
      db.query('SELECT salary, department FROM roles WHERE title = ?', role, (err, results) => { 
        if (err) {
          console.error('Error retrieving role information:', err);
        } else {
          const salary = results[0].salary;
          const department = results[0].department;
          const values = [firstName, lastName, role, manager === 'None' ? null: manager, salary, department];
      
          db.query('INSERT INTO employees (first_name, last_name, role, manager, salary, department) VALUES (?, ?, ?, ?, ?, ?)', values, (err, results) => {
            if (err) {
              console.error('Error adding employee:', err);
            } else {
              console.log('Employee added successfully!');
              menu();
            }
          });
        }
      });
    }); 
  } else if (selection.options === 'Update an employee role') {
    inquirer.prompt([
      {
        type: 'list',
        name: 'employee',
        message: 'Select which employee will have their role updated:',
        choices: getEmployeeChoices(),
      },
      {
        type: 'list',
        name: 'role',
        message: 'Select which role you would like to switch to:',
        choices: getRoleChoices(),
      },
    ])
    .then((answers) => {
      const employeeId = answers.employee;
      const roleId = answers.role;

      db.query('UPDATE employees SET role_id = ? WHERE id = ?', [roleId, employeeId], (err, result) => {
        if (err) {
          console.log('Error updating employee role:', err);
        } else {
          console.log('Employee role updated successfully!');
          menu();
        }
      });
    });
  } else if (selection.options === 'Quit') {
    process.exit();
  }
};

function getDepartmentChoices() {
  return new Promise((resolve, reject) => {
    db.query('SELECT department_name FROM department', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const departmentNames = results.map((row) => row.department_name); 
        resolve(departmentNames);
      }
    });
  });
}

function getRoleChoices() {
  return new Promise((resolve, reject) => {
    db.query('SELECT title FROM roles', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const roleNames = results.map((row) => row.title); 
        resolve(roleNames);
      }
    });
  });
}

function getManagerChoices() {
  return new Promise((resolve, reject) => {
    db.query('SELECT CONCAT(first_name, " ", last_name) AS manager_name FROM employees', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const managerNames = results.map((row) => row.manager_name);
        managerNames.unshift('None');
        resolve(managerNames);
      }
    });
  });
}

function getEmployeeChoices() {
  return new Promise((resolve, reject) => {
    db.query('SELECT first_name, last_name FROM employees', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const employeeNames = results.map((employee) => ({
          name: `${employee.first_name} ${employee.last_name}`,
          value: employee.id,
        })); 
        resolve(employeeNames);
      }
    });
  });
}
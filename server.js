const mysql = require('mysql2');
const inquirer = require('inquirer');

//need to enter mysql password below
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'employee_db'
});

//connects to server
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the employee database.');
  menu();
});

//displays cli menu
const menu = async () => {
  const selection = await inquirer.prompt([
    {
      type: 'list',
      name: 'options',
      message: 'What would you like to do?',
      choices: ['View all departments', 'View all roles', 'View all employees', 'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', 'Quit']
    }
  ]);

  //shows the department table if it is selected in the menu
  if(selection.options === 'View all departments') {
    db.query('SELECT * FROM department', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'View all roles') { //Shows the roles table if it is selected in the menu
    db.query('SELECT roles.id, roles.title, department.department_name AS department, roles.salary FROM roles JOIN department ON roles.department_id = department.id ORDER BY department.id', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'View all employees') { //Shows the employees table if it is selected in the menu
    db.query('SELECT employees.id, employees.first_name, employees.last_name, roles.title, department.department_name AS department, roles.salary, CONCAT(manager.first_name, \' \', manager.last_name) AS manager_name FROM employees JOIN roles ON employees.role_id = roles.id JOIN department ON roles.department_id = department.id LEFT JOIN employees manager ON employees.manager_id = manager.id ORDER BY employees.id', (err, results) => {
      if (err) throw err;
      console.table(results);
      menu();
    });
  } else if (selection.options === 'Add a department') { //Asks the user questions so that they can add a new department to the department table and adds it to the table
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
  } else if (selection.options === 'Add a role') { //Asks a user questions so that they can add a role and then adds the role
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
        choices: async () => await getDepartmentChoices(),
      },
    ])
    .then((answers) => {
      const roleName = answers.role;
      const salary = answers.salary;
      const departmentName = answers.department;
      const values = [roleName, salary, departmentName];

      db.query('INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)', values, (err, results) => {
        if (err) {
          console.error('Error adding role:', err);
        } else {
          console.log('Role added successfully!');
          menu();
        }
      });
    });
  } else if (selection.options === 'Add an employee') { //Asks the user questions for adding a new employee to the employees table and then adds the employee
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
        type: 'list',
        name: 'role',
        message: 'Select the employess\'s role:',
        choices: async () => await getRoleChoices(),
      },
      {
        type: 'list',
        name: 'manager',
        message: 'Who is this employees manager?',
        choices: async () => await getManagerChoices(),
      },
    ])
    .then((answers) => {
      const firstName = answers.first;
      const lastName = answers.last;
      const role = answers.role;
      const manager = answers.manager;
    
      db.query('SELECT id AS role_id FROM roles WHERE title = ?', role, (err, results) => {
        if (err) {
          console.error('Error retrieving role information:', err);
        } else {
          const role_id = results[0].role_id;
    
          db.query('SELECT id AS manager_id FROM employees WHERE CONCAT(first_name, " ", last_name) = ?', manager, (err, results) => {
            if (err) {
              console.error('Error retrieving manager information:', err);
            } else {
              const manager_id = results[0] ? results[0].manager_id : null;
              const values = [firstName, lastName, role_id, manager_id];
    
              db.query('INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)', values, (err, results) => {
                if (err) {
                  console.error('Error adding employee:', err);
                } else {
                  console.log('Employee added successfully!');
                  menu();
                }
              });
            }
          });
        }
      });
    });
  } else if (selection.options === 'Update an employee role') { //updates the role of an existing employee
    inquirer.prompt([
      {
        type: 'list',
        name: 'employee',
        message: 'Select which employee will have their role updated:',
        choices: async () => await getEmployeeChoices(),
      },
      {
        type: 'list',
        name: 'role',
        message: 'Select which role you would like to switch to:',
        choices: async () => await getRoleChoices(),
      },
    ])
    .then((answers) => {
      const employeeId = answers.employee;
      const roleName = answers.role;

      db.query('SELECT id FROM roles WHERE title = ?', [roleName], (err, result) => {
        if (err) {
          console.log('Error retrieving role ID:', err);
        } else {
          const roleId = result[0].id;
    
          db.query('UPDATE employees SET role_id = ? WHERE id = ?', [roleId, employeeId], (err, result) => {
            if (err) {
              console.log('Error updating employee role:', err);
            } else {
              console.log('Employee role updated successfully!');
              menu();
            }
          });
        }
      });
    });
  } else if (selection.options === 'Quit') { //quits out of the program
    process.exit();
  }
};

function getDepartmentChoices() { //function for displaying a list of departments for the inquirer question in the cli
  return new Promise((resolve, reject) => {
    db.query('SELECT id, department_name FROM department', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const departments = results.map((row) => ({
          name: row.department_name,
          value: row.id
        }));
        resolve(departments);
      }
    });
  });
}

function getRoleChoices() { //function for displaying a list of roles for the inquirer question in the cli
  return new Promise((resolve, reject) => {
    db.query('SELECT id, title FROM roles', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const roleNames = results.map((row) => row.title); 
        resolve(roleNames);
      }
    });
  });
}

function getManagerChoices() { //function for displaying a list of managers for the inquirer question in the cli
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

function getEmployeeChoices() { //function for displaying a list of all employees for the inquirer question in the cli
  return new Promise((resolve, reject) => {
    db.query('SELECT id, first_name, last_name FROM employees', (err, results) => {
      if (err) {
        reject(err);
      } else {
        const employeeNames = results.map((employees) => ({
          name: `${employees.first_name} ${employees.last_name}`,
          value: employees.id,
        })); 
        resolve(employeeNames);
      }
    });
  });
}
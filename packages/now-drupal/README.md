# @now-drupal

This pakage help you install drupal sites in ZEIT Servers.

More details here: https://zeit.co/docs/v2/deployments/builders/overview/

### For installing Your Drupal Site, must to do this steps:


  1-you need to use external mysql dabase via some sites like :https://remotemysql.com

![picture alt](http://i63.tinypic.com/1rztza.png "Title is optional")

  2-creat ```now.jason``` file in your local folder by this way (you could see one exaple via test folder):

```
{
  "version": 2,
  "builds": [
    { "src": "settings.php", "use": "@now/drupal",
      "config": { "releaseUrl": "Your all Drupal site Backup file or drupal git file",
                  "patchForPersistentConnections": true } }
  ],
  "routes": [
    { "src": "/sites/default/?", "dest": "index.php" },
    { "src": ".*\\.php$", "dest": "index.php" }
  ],
  "env": {
    "DB_NAME": "@drupal_db_name",
    "DB_USER": "@drupal_user",
    "DB_PASSWORD": "@drupal_db_password",
    "DB_HOST": "@drupal_db_host"
  }
}
```
  you could change ```@drupal_db_name and ...``` by the information get by remote mysql server or 
  leave the this kind And set the by ```now secret add.```  instruction to add ```DB_NAME and ... ``` Databse parameters 


  3-you must edite your settings.php file via "sites/default" folder by this way:

```
 // ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for External MYSQL Server.
*/
$databases = array (
  'default' => 
  array (
    'default' => 
    array (
      'database' => $_ENV['DB_NAME'],
      'username' => $_ENV['DB_USER'],
      'password' => $_ENV['DB_PASSWORD'],
      'host' => $_ENV['DB_HOST'],
      'port' =>  $_ENV['DB_PORT'],
      'driver' => 'mysql',
      'prefix' => '',
    ),
  ),
);
```

   4-finaly run ```now dev```.

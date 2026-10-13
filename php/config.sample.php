<?php
// Copy to config.php and fill in. config.php is git-ignored and blocked from web access.
return [
    'host'       => 'smtp.example.com',
    'port'       => 587,
    'encryption' => 'tls',          // 'tls' (STARTTLS, 587) or 'ssl' (465)
    'username'   => 'user@example.com',
    'password'   => '',
    'from_email' => 'no-reply@mjbwood.com',
    'from_name'  => 'MJB Wood Website',
    'to_email'   => 'info@mjbwood.com',
];

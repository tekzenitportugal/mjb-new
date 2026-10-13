<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $code, string $message)
{
    http_response_code($code);
    echo json_encode(['ok' => $code === 200, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, 'Method not allowed.');
}

// Honeypot: real visitors never fill this in; pretend success for bots.
if (!empty($_POST['hp_extra_note'])) {
    respond(200, 'Thank you. You’re on the waitlist.');
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('send-waitlist: config.php missing');
    respond(500, 'The form is not configured yet. Please email us directly.');
}
$config = require $configFile;

$clean = static fn(string $value, int $max): string =>
    mb_substr(trim(preg_replace('/[\r\n]+/', ' ', $value)), 0, $max);

$email   = $clean((string) ($_POST['email'] ?? ''), 254);
$country = $clean((string) ($_POST['country'] ?? ''), 50);
$role    = $clean((string) ($_POST['role'] ?? ''), 50);

// Only accept the values the form offers.
$countries = ['United States', 'Mexico'];
$roles     = ['Builder / contractor', 'Dealer', 'Manufacturer', 'Other'];
$interests = ['Cabinets', 'Shelving', 'Millwork'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($country, $countries, true)) {
    respond(422, 'Please enter a valid email address.');
}
if ($role !== '' && !in_array($role, $roles, true)) {
    $role = '';
}
$chosen = array_values(array_intersect($interests, array_map('strval', (array) ($_POST['interest'] ?? []))));

require __DIR__ . '/email-template.php';
require __DIR__ . '/phpmailer/Exception.php';
require __DIR__ . '/phpmailer/PHPMailer.php';
require __DIR__ . '/phpmailer/SMTP.php';

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = $config['host'];
    $mail->Port       = (int) $config['port'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['username'];
    $mail->Password   = $config['password'];
    $mail->SMTPSecure = $config['encryption'] === 'ssl'
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($config['to_email']);
    $mail->addReplyTo($email);

    $content = build_email(
        $config['site_url'] ?? 'https://mjbwood.com',
        'Cato waitlist',
        'New waitlist signup',
        "$email joined the waitlist for Cato cabinets and shelving.",
        [
            'Email'         => $email,
            'Country'       => $country,
            "I'm a"         => $role,
            'Interested in' => $chosen ? implode(', ', $chosen) : '',
        ],
        null,
        $email,
        'Cato cabinets and shelving: MJB Wood',
        'cid:mjb-logo'
    );
    $mail->addEmbeddedImage(__DIR__ . '/../assets/email/logo.png', 'mjb-logo', 'mjb-wood-logo.png', 'base64', 'image/png');
    $mail->isHTML(true);
    $mail->Subject = 'Cato waitlist signup: ' . $email;
    $mail->Body    = $content['html'];
    $mail->AltBody = $content['text'];
    $mail->send();
    respond(200, 'Thank you. You’re on the waitlist.');
} catch (Exception $e) {
    error_log('send-waitlist: ' . $mail->ErrorInfo);
    respond(500, 'Sorry, we could not add you to the waitlist. Please email us directly.');
}

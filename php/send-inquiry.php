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
if (!empty($_POST['website'])) {
    respond(200, 'Thank you. Your inquiry has been sent.');
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    error_log('send-inquiry: config.php missing');
    respond(500, 'The form is not configured yet. Please email us directly.');
}
$config = require $configFile;

$clean = static fn(string $key, int $max): string =>
    mb_substr(trim(preg_replace('/[\r\n]+/', ' ', (string) ($_POST[$key] ?? ''))), 0, $max);

$name    = $clean('name', 150);
$company = $clean('company', 150);
$email   = $clean('email', 254);
$phone   = $clean('phone', 50);
$message = mb_substr(trim((string) ($_POST['message'] ?? '')), 0, 5000);

if ($name === '' || $company === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($_POST['consent'])) {
    respond(422, 'Please complete all required fields with a valid email.');
}

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
    $mail->addReplyTo($email, $name);

    // Attachments: same limits as the front end.
    $allowed = ['pdf', 'dwg', 'jpg', 'jpeg', 'png'];
    $total = 0;
    foreach ($_FILES['files']['name'] ?? [] as $i => $original) {
        if (($_FILES['files']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $size = (int) $_FILES['files']['size'][$i];
        $ext  = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        if ($_FILES['files']['error'][$i] !== UPLOAD_ERR_OK || $size > 20 * 1024 * 1024
            || !in_array($ext, $allowed, true) || !is_uploaded_file($_FILES['files']['tmp_name'][$i])) {
            respond(422, 'One of the files is invalid. Use PDF, DWG, JPG or PNG up to 20 MB.');
        }
        $total += $size;
        if ($total > 25 * 1024 * 1024) {
            respond(422, 'Attachments are too large in total (25 MB maximum).');
        }
        $mail->addAttachment($_FILES['files']['tmp_name'][$i], preg_replace('/[^\w.\- ]/', '_', basename($original)));
    }

    $mail->Subject = "Website inquiry from $name ($company)";
    $mail->Body    = "Name: $name\nCompany: $company\nEmail: $email\nPhone: " . ($phone ?: '-') . "\n\nMessage:\n$message\n";
    $mail->send();
    respond(200, 'Thank you. Your inquiry has been sent.');
} catch (Exception $e) {
    error_log('send-inquiry: ' . $mail->ErrorInfo);
    respond(500, 'Sorry, we could not send your inquiry. Please email us directly.');
}

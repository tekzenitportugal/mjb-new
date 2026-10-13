<?php
declare(strict_types=1);

/**
 * Branded HTML email shared by the inquiry and waitlist forms.
 * Table layout with inline styles so it renders in Gmail, Outlook and Apple Mail.
 *
 * @param string                 $siteUrl  Public site root, no trailing slash (used for the logo and links).
 * @param string                 $eyebrow  Small label above the heading, e.g. "New website inquiry".
 * @param string                 $title    Heading.
 * @param string                 $intro    One-line description under the heading.
 * @param array<string,string>   $rows     Label => value pairs shown in the details table.
 * @param string|null            $message  Optional free-text message block.
 * @param string|null            $replyTo  Optional email address for the "Reply" button.
 * @param string|null            $replySubject Optional subject for the reply.
 * @return array{html:string,text:string}
 */
function build_email(
    string $siteUrl,
    string $eyebrow,
    string $title,
    string $intro,
    array $rows,
    ?string $message = null,
    ?string $replyTo = null,
    ?string $replySubject = null,
    ?string $logoSrc = null,
    ?string $replyUrl = null,
    ?string $replyLabel = null
): array {
    $e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $siteUrl = rtrim($siteUrl, '/');

    $rowsHtml = '';
    $last = array_key_last($rows);
    foreach ($rows as $label => $value) {
        $value = trim($value) === '' ? '-' : $value;
        $border = $label === $last ? '' : 'border-bottom:1px solid #e5e9e2;';
        $linkStyle = 'color:#2e302b;text-decoration:underline;';
        if ($label === 'Email' && $value !== '-') {
            $display = '<a href="mailto:' . $e($value) . '" style="' . $linkStyle . '">' . $e($value) . '</a>';
        } elseif ($label === 'Phone' && $value !== '-') {
            $display = '<a href="tel:' . $e(preg_replace('/[^\d+]/', '', $value)) . '" style="' . $linkStyle . '">' . $e($value) . '</a>';
        } elseif ($label === 'WhatsApp' && $value !== '-') {
            $display = '<a href="https://wa.me/' . $e(preg_replace('/\D/', '', $value)) . '" style="' . $linkStyle . '">' . $e($value) . '</a>';
        } else {
            $display = $e($value);
        }
        $rowsHtml .= '<tr>'
            . '<td style="' . $border . 'padding:14px 0;width:34%;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:.04em;text-transform:uppercase;color:#82867e;">' . $e((string) $label) . '</td>'
            . '<td style="' . $border . 'padding:14px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#2e302b;">' . $display . '</td>'
            . '</tr>';
    }

    $messageHtml = '';
    if ($message !== null && trim($message) !== '') {
        $messageHtml = '<tr><td style="padding:8px 40px 0;">'
            . '<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:.04em;text-transform:uppercase;color:#82867e;">Message</p>'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>'
            . '<td style="background:#f5f7f3;border-left:4px solid #657a3c;padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#2e302b;word-wrap:break-word;">'
            . nl2br($e(trim($message)), false)
            . '</td></tr></table></td></tr>';
    }

    $buttonHtml = '';
    $href = null;
    $buttonLabel = $replyLabel;
    if ($replyUrl !== null && $replyUrl !== '') {
        $href = $replyUrl;
    } elseif ($replyTo !== null && $replyTo !== '') {
        $href = 'mailto:' . rawurlencode($replyTo) . ($replySubject ? '?subject=' . rawurlencode($replySubject) : '');
        $buttonLabel = $buttonLabel ?? 'Reply to ' . $replyTo;
    }
    if ($href !== null) {
        $buttonHtml = '<tr><td style="padding:32px 40px 0;">'
            . '<a href="' . $e($href) . '" style="display:inline-block;background:#151714;color:#f4f9ec;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;padding:14px 26px;border-radius:12px;">' . $e($buttonLabel ?? 'Reply') . '</a>'
            . '</td></tr>';
    }

    $html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $e($title) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#eef1ec;">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' . $e($intro) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ec;"><tr><td align="center" style="padding:32px 12px;">'
        . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;table-layout:fixed;background:#ffffff;border-radius:12px;overflow:hidden;">'
        // Header with logo
        . '<tr><td align="center" style="background:#fafcf9;padding:32px 40px 24px;border-bottom:3px solid #657a3c;">'
        . '<a href="' . $e($siteUrl) . '"><img src="' . $e($logoSrc ?? ($siteUrl . '/assets/email/logo.png')) . '" width="130" height="80" alt="MJB Wood" style="display:block;border:0;outline:none;width:130px;height:80px;"></a>'
        . '</td></tr>'
        // Heading
        . '<tr><td style="padding:36px 40px 8px;">'
        . '<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:.08em;text-transform:uppercase;color:#657a3c;font-weight:bold;">' . $e($eyebrow) . '</p>'
        . '<h1 style="margin:0 0 12px;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;line-height:34px;font-weight:normal;color:#2e302b;">' . $e($title) . '</h1>'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#545751;">' . $e($intro) . '</p>'
        . '</td></tr>'
        // Details
        . '<tr><td style="padding:16px 40px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e9e2;">' . $rowsHtml . '</table></td></tr>'
        . $messageHtml
        . $buttonHtml
        . '<tr><td style="padding:40px 0 0;"></td></tr>'
        // Footer
        . '<tr><td style="background:#2e302b;padding:28px 40px;">'
        . '<p style="margin:0 0 6px;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:22px;color:#e5e9e2;">MJB Wood Group</p>'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#afb4aa;">103 Stonemont Court, Bristol, IN 46507<br>'
        . '<a href="tel:+19724010005" style="color:#d7dcd3;text-decoration:none;">(972) 401-0005</a> &nbsp;·&nbsp; '
        . '<a href="mailto:info@mjbwood.com" style="color:#d7dcd3;text-decoration:none;">info@mjbwood.com</a> &nbsp;·&nbsp; '
        . '<a href="' . $e($siteUrl) . '" style="color:#d7dcd3;text-decoration:none;">mjbwood.com</a></p>'        . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    $text = $eyebrow . "\n" . $title . "\n" . $intro . "\n\n";
    foreach ($rows as $label => $value) {
        $text .= $label . ': ' . (trim($value) === '' ? '-' : $value) . "\n";
    }
    if ($message !== null && trim($message) !== '') {
        $text .= "\nMessage:\n" . trim($message) . "\n";
    }
    $text .= "\nMJB Wood Group | 103 Stonemont Court, Bristol, IN 46507 | (972) 401-0005 | info@mjbwood.com\n";

    return ['html' => $html, 'text' => $text];
}

function new-hexsecret {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
      $rng.GetBytes($bytes)
      return (-join ($bytes | ForEach-Object { $_.ToString("x2") }))
  }
  finally {
      $rng.Dispose()
  }
}
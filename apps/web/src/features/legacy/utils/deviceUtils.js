export function parseDeviceInfo(ua = '') {
  const target = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  let os = 'Unknown OS'
  if (/Windows NT 10|Windows NT 11/.test(target)) os = 'Windows 10/11'
  else if (/Windows NT 6/.test(target)) os = 'Windows'
  else if (/iPhone/.test(target)) os = 'iPhone'
  else if (/iPad/.test(target)) os = 'iPad'
  else if (/Android/.test(target)) os = 'Android'
  else if (/Mac OS X/.test(target)) os = 'macOS'
  else if (/Linux/.test(target)) os = 'Linux'
  let browser = 'Unknown Browser'
  if (/Edg\//.test(target)) browser = 'Edge'
  else if (/OPR\//.test(target)) browser = 'Opera'
  else if (/Chrome\//.test(target)) browser = 'Chrome'
  else if (/Firefox\//.test(target)) browser = 'Firefox'
  else if (/Safari\//.test(target)) browser = 'Safari'
  return `${os} · ${browser}`
}

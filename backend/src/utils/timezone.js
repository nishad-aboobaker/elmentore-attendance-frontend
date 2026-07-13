const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDate(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function buildISTDateTime(sessionDate, timeStr) {
  const d = new Date(sessionDate.getTime() + IST_OFFSET_MS);
  
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  
  const isoStr = `${yyyy}-${mm}-${dd}T${timeStr}:00+05:30`;
  return new Date(isoStr);
}

module.exports = {
  getISTDate,
  buildISTDateTime
};

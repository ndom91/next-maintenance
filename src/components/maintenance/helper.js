import { isValid, format } from "date-fns"

// deduplicate array of objects
const getUnique = (arr, comp) => {
  const unique = arr
    .map((e) => e[comp])
    .map((e, i, final) => final.indexOf(e) === i && i)
    .filter((e) => arr[e])
    .map((e) => arr[e])
  return unique
}

// convert datetime
const convertDateTime = (datetime) => {
  let newDateTime
  if (isValid(new Date(datetime))) {
    newDateTime = format(new Date(datetime), "dd.MM.yyyy, HH:mm:ss")
  } else {
    newDateTime = datetime
  }
  return newDateTime
}

// deep flatten objects
const flattenObject = (obj) => {
  return Object.keys(obj).reduce((acc, k) => {
    if (typeof obj[k] === "object") Object.assign(acc, flattenObject(obj[k], k))
    else acc[k] = obj[k]
    return acc
  }, {})
}

// deep flatten objects with dot notations/prefixes
const flattenObjectPrefix = (obj, prefix = "") => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + "." : ""
    if (typeof obj[k] === "object")
      Object.assign(acc, flattenObject(obj[k], pre + k))
    else acc[pre + k] = obj[k]
    return acc
  }, {})
}

export { getUnique, convertDateTime, flattenObject, flattenObjectPrefix }

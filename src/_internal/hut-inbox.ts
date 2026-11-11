// Tonight's booking requests, as they arrived in the hut's inbox: raw JSON text. You do not need to modify this file.

/** the hut sleeps ten, five bunks on each tier */
export const CAPACITY = 10

export const requests: readonly string[] = [
  '{"guest":"Heidi","party":2,"nights":1}',
  '{"guest":"Reto","party":"3","nights":2}',
  '{"guest":"Anna","party":3,"nights":2}',
  '{"guest":"Luca","party":1,',
  '{"guest":"Sofia","party":4,"nights":1}',
  '{"guest":"Marco","nights":1}',
  '{"guest":"Jonas","party":1,"nights":3}',
]

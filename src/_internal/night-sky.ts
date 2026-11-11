// Tonight's catalogue and the telescope's views. You do not need to modify this file.
// Right ascension (ra) is in hours, declination (dec) in degrees, distance in light years.

export type StarRecord = {
  id: string
  name: string
  constellation: string
  ra: number
  dec: number
  magnitude: number
  distance: number
}

export const stars: readonly StarRecord[] = [
  { id: 'HIP 27989', name: 'Betelgeuse', constellation: 'Orion', ra: 5.92, dec: 7.41, magnitude: 0.5, distance: 548 },
  { id: 'HIP 24436', name: 'Rigel', constellation: 'Orion', ra: 5.24, dec: -8.2, magnitude: 0.13, distance: 860 },
  { id: 'HIP 25336', name: 'Bellatrix', constellation: 'Orion', ra: 5.42, dec: 6.35, magnitude: 1.64, distance: 250 },
  { id: 'HIP 27366', name: 'Saiph', constellation: 'Orion', ra: 5.8, dec: -9.67, magnitude: 2.09, distance: 650 },
  { id: 'HIP 26727', name: 'Alnitak', constellation: 'Orion', ra: 5.68, dec: -1.94, magnitude: 1.77, distance: 1260 },
  { id: 'HIP 26311', name: 'Alnilam', constellation: 'Orion', ra: 5.6, dec: -1.2, magnitude: 1.69, distance: 2000 },
  { id: 'HIP 25930', name: 'Mintaka', constellation: 'Orion', ra: 5.53, dec: -0.3, magnitude: 2.23, distance: 1200 },
  { id: 'HIP 32349', name: 'Sirius', constellation: 'Canis Major', ra: 6.75, dec: -16.72, magnitude: -1.46, distance: 8.6 },
  { id: 'HIP 37279', name: 'Procyon', constellation: 'Canis Minor', ra: 7.66, dec: 5.22, magnitude: 0.34, distance: 11.5 },
  { id: 'HIP 21421', name: 'Aldebaran', constellation: 'Taurus', ra: 4.6, dec: 16.51, magnitude: 0.85, distance: 65 },
]

function star(name: string): StarRecord {
  const found = stars.find(s => s.name === name)
  if (!found) throw new Error(`No star called ${name}`)
  return found
}

export type SkyView = { name: string; star: StarRecord; zoom?: SkyView }

// The telescope starts on the whole winter sky, then zooms in on Orion, then on Orion's Belt
export const winterSky: SkyView = {
  name: 'Winter sky',
  star: star('Sirius'),
  zoom: {
    name: 'Orion',
    star: star('Rigel'),
    zoom: { name: "Orion's Belt", star: star('Alnilam') },
  },
}

// The lines drawn between catalogued stars, by name
export const figures: readonly (readonly [string, string])[] = [
  ['Betelgeuse', 'Bellatrix'],
  ['Betelgeuse', 'Alnitak'],
  ['Bellatrix', 'Mintaka'],
  ['Mintaka', 'Alnilam'],
  ['Alnilam', 'Alnitak'],
  ['Alnitak', 'Saiph'],
  ['Mintaka', 'Rigel'],
]

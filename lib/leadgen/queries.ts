// Niche search queries per market — ported from leadgen.py NICHE_QUERIES

export type LeadgenMarket = "hr" | "dach" | "us" | "uk";

export const MARKET_NICHES: Record<LeadgenMarket, string[]> = {
  hr: ["frizer", "kozmetika", "autoservis", "dental", "fitness", "wellness", "restoran", "apartmani", "pekara", "fizioterapija", "luxury_villa", "charter", "boutique_hotel", "ostalo"],
  dach: ["frizer", "kozmetika", "autoservis", "dental", "fitness", "wellness", "restoran", "apartmani", "pekara", "fizioterapija", "ostalo"],
  us: ["salon", "barbershop", "restaurant", "dental", "fitness", "wellness", "veterinary", "tattoo", "photographer", "realtor", "lawyer", "other"],
  uk: ["salon", "barbershop", "restaurant", "dental", "fitness", "wellness", "veterinary", "tattoo", "photographer", "realtor", "lawyer", "other"],
};

// Each niche has multiple search query variations to maximize Google Maps coverage
export const NICHE_QUERIES: Record<string, Record<string, string[]>> = {
  hr: {
    frizer: ["frizerski salon", "frizer", "hair salon", "barber shop brijačnica"],
    kozmetika: ["kozmetički salon", "salon ljepote", "beauty salon", "manikura pedikura"],
    autoservis: ["autoservis", "auto mehaničar", "auto servis popravak"],
    dental: ["stomatolog", "zubni liječnik zubar", "stomatološka ordinacija", "dentist"],
    fitness: ["teretana", "fitness centar", "gym"],
    wellness: ["wellness spa", "salon za masažu", "sauna wellness centar"],
    restoran: ["restoran", "konoba", "pizzeria", "bistro caffe bar hrana"],
    apartmani: ["apartmani smještaj", "sobe za iznajmljivanje", "vacation rental"],
    pekara: ["pekara", "pekarnica slastičarnica"],
    fizioterapija: ["fizioterapija", "fizioterapeut rehabilitacija", "kiropraktičar"],
    luxury_villa: ["luksuzna vila s bazenom", "luxury villa Croatia", "premium apartmani", "villa s bazenom Hrvatska"],
    charter: ["charter yacht Croatia", "najam jahte", "charter brodovi", "rent a boat Croatia"],
    boutique_hotel: ["boutique hotel Croatia", "mali hotel Hrvatska", "heritage hotel", "dizajn hotel Hrvatska"],
    ostalo: [""],
  },
  dach: {
    frizer: ["Friseur Friseursalon", "Barbershop Herrenfriseur", "hair salon", "Damenfriseur"],
    kozmetika: ["Kosmetikstudio", "Schönheitssalon Beauty Salon", "Nagelstudio Maniküre"],
    autoservis: ["Autowerkstatt", "KFZ-Werkstatt", "Automechaniker Reparatur"],
    dental: ["Zahnarzt", "Zahnarztpraxis", "Zahnklinik Dentist"],
    fitness: ["Fitnessstudio", "Gym Krafttraining", "Sportstudio"],
    wellness: ["Wellness Spa", "Massagestudio Massage", "Sauna Wellness"],
    restoran: ["Restaurant", "Gasthaus Wirtshaus", "Pizzeria Trattoria"],
    apartmani: ["Ferienwohnung", "Apartment Unterkunft", "Pension Zimmer"],
    pekara: ["Bäckerei", "Konditorei Café"],
    fizioterapija: ["Physiotherapie", "Physiotherapeut Rehabilitation", "Chiropraktiker"],
    ostalo: [""],
  },
  us: {
    salon: ["beauty salon", "hair salon", "nail salon", "lash studio"],
    barbershop: ["barbershop", "barber shop", "men's grooming"],
    restaurant: ["restaurant", "bistro", "cafe", "trattoria", "diner"],
    dental: ["dentist", "dental clinic", "dental office", "orthodontist"],
    fitness: ["gym", "fitness center", "personal trainer", "CrossFit"],
    wellness: ["spa", "wellness center", "massage studio", "medspa"],
    veterinary: ["veterinary clinic", "vet", "animal hospital"],
    tattoo: ["tattoo studio", "tattoo shop", "tattoo parlor"],
    photographer: ["photographer", "photography studio", "portrait photographer"],
    realtor: ["real estate agent", "realtor"],
    lawyer: ["law firm", "attorney", "lawyer"],
    other: [""],
  },
  uk: {
    salon: ["beauty salon", "hair salon", "nail salon", "lash studio"],
    barbershop: ["barbershop", "barber shop", "men's grooming"],
    restaurant: ["restaurant", "bistro", "café", "gastropub"],
    dental: ["dentist", "dental practice", "dental surgery"],
    fitness: ["gym", "fitness centre", "personal trainer"],
    wellness: ["spa", "wellness centre", "massage studio", "beauty clinic"],
    veterinary: ["veterinary practice", "vet surgery", "animal clinic"],
    tattoo: ["tattoo studio", "tattoo shop", "tattoo parlour"],
    photographer: ["photographer", "photography studio"],
    realtor: ["estate agent", "property agent"],
    lawyer: ["solicitor", "law firm", "barrister"],
    other: [""],
  },
};

// DACH city-to-country code mapping for Google search gl parameter
export const DACH_GL_MAP: Record<string, string> = {
  wien: "at", graz: "at", linz: "at", salzburg: "at", innsbruck: "at",
  münchen: "de", munich: "de", berlin: "de", hamburg: "de", köln: "de",
  frankfurt: "de", stuttgart: "de", düsseldorf: "de", dortmund: "de", essen: "de",
  zürich: "ch", zurich: "ch", bern: "ch", basel: "ch", genf: "ch", luzern: "ch",
};

// Niche display labels
export const NICHE_LABELS: Record<string, Record<string, string>> = {
  hr: {
    frizer: "Frizer", kozmetika: "Kozmetika", autoservis: "Autoservis",
    dental: "Dental", fitness: "Fitness", wellness: "Wellness",
    restoran: "Restoran", apartmani: "Apartmani", pekara: "Pekara",
    fizioterapija: "Fizioterapija", luxury_villa: "Luksuzna Vila",
    charter: "Charter", boutique_hotel: "Boutique Hotel", ostalo: "Ostalo",
  },
  dach: {
    frizer: "Friseur", kozmetika: "Kosmetik", autoservis: "Autowerkstatt",
    dental: "Zahnarzt", fitness: "Fitness", wellness: "Wellness",
    restoran: "Restaurant", apartmani: "Ferienwohnung", pekara: "Bäckerei",
    fizioterapija: "Physiotherapie", ostalo: "Sonstiges",
  },
  us: {
    salon: "Salon", barbershop: "Barbershop", restaurant: "Restaurant",
    dental: "Dental", fitness: "Fitness", wellness: "Wellness/Spa",
    veterinary: "Veterinary", tattoo: "Tattoo", photographer: "Photographer",
    realtor: "Realtor", lawyer: "Lawyer", other: "Other",
  },
  uk: {
    salon: "Salon", barbershop: "Barbershop", restaurant: "Restaurant",
    dental: "Dental", fitness: "Fitness", wellness: "Wellness/Spa",
    veterinary: "Veterinary", tattoo: "Tattoo", photographer: "Photographer",
    realtor: "Estate Agent", lawyer: "Solicitor", other: "Other",
  },
};

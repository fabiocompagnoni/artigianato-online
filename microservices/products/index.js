

/**
 * @version 1.0
 * @author Fabio Compagnoni
 */
import {express} from "express";
import {Pool} from "pg";
const PORT = 4002;

const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(express.json());


app.listen(PORT, () => {
    console.log(`Products service running on port ${PORT}`);
});

app.get('/products', async (req, res) => {
    try {
        
        res.json({
            products: [
                {
                    id: 1,
                    name: "Vaso in Ceramica",
                    description: "Vaso artigianale decorato a mano",
                    price: 89.99,
                    category: ["Ceramica", "Arredamento", "Casa"],
                    artisan: {
                        name: "Aldo",
                        surname: "Baglio",
                        photoProfile: "https://localhost:4003/aldo-profile.jpg"
                    },
                    product_image: "https://localhost:4003/vaso-ceramica.jpg",
                    link: "/prodotti/aldo-baglio/vaso-ceramica"
                },
                {
                    id: 2,
                    name: "Collana in Argento",
                    description: "Collana artigianale in argento 925",
                    price: 149.99,
                    category: ["Gioielli", "Accessori", "Argento"],
                    artisan: {
                        name: "Maria",
                        surname: "Rossi",
                        photoProfile: "https://localhost:4003/maria-profile.jpg"
                    },
                    product_image: "https://localhost:4003/collana-argento.jpg",
                    link: "/prodotti/maria-rossi/collana-argento"
                },
                {
                    id: 3,
                    name: "Tavolo in Legno Massello",
                    description: "Tavolo artigianale in legno di noce",
                    price: 899.99,
                    category: ["Mobili", "Arredamento", "Legno"],
                    artisan: {
                        name: "Giovanni",
                        surname: "Bianchi",
                        photoProfile: "https://localhost:4003/giovanni-profile.jpg"
                    },
                    product_image: "https://localhost:4003/tavolo-legno.jpg",
                    link: "/prodotti/giovanni-bianchi/tavolo-legno"
                },
                {
                    id: 4,
                    name: "Orecchini in Vetro di Murano",
                    description: "Orecchini artigianali in vetro soffiato",
                    price: 79.99,
                    category: ["Gioielli", "Accessori", "Vetro"],
                    artisan: {
                        name: "Laura",
                        surname: "Neri",
                        photoProfile: "https://localhost:4003/laura-profile.jpg"
                    },
                    product_image: "https://localhost:4003/orecchini-vetro.jpg",
                    link: "/prodotti/laura-neri/orecchini-vetro"
                },
                {
                    id: 5,
                    name: "Tappeto Intrecciato",
                    description: "Tappeto fatto a mano con lana naturale",
                    price: 299.99,
                    category: ["Tessuti", "Arredamento", "Casa"],
                    artisan: {
                        name: "Anna",
                        surname: "Ferrari",
                        photoProfile: "https://localhost:4003/anna-profile.jpg"
                    },
                    product_image: "https://localhost:4003/tappeto-intrecciato.jpg",
                    link: "/prodotti/anna-ferrari/tappeto-intrecciato"
                },
                {
                    id: 6,
                    name: "Coltello Artigianale",
                    description: "Coltello forgiato a mano con manico in legno",
                    price: 129.99,
                    category: ["Utensili", "Cucina", "Metallo"],
                    artisan: {
                        name: "Roberto",
                        surname: "Romano",
                        photoProfile: "https://localhost:4003/roberto-profile.jpg"
                    },
                    product_image: "https://localhost:4003/coltello-artigianale.jpg",
                    link: "/prodotti/roberto-romano/coltello-artigianale"
                },
                {
                    id: 7,
                    name: "Borsa in Pelle",
                    description: "Borsa artigianale in pelle conciata",
                    price: 199.99,
                    category: ["Accessori", "Moda", "Pelle"],
                    artisan: {
                        name: "Sofia",
                        surname: "Marino",
                        photoProfile: "https://localhost:4003/sofia-profile.jpg"
                    },
                    product_image: "https://localhost:4003/borsa-pelle.jpg",
                    link: "/prodotti/sofia-marino/borsa-pelle"
                },
                {
                    id: 8,
                    name: "Scultura in Bronzo",
                    description: "Scultura moderna in bronzo fuso",
                    price: 599.99,
                    category: ["Arte", "Decorazione", "Metallo"],
                    artisan: {
                        name: "Paolo",
                        surname: "Conti",
                        photoProfile: "https://localhost:4003/paolo-profile.jpg"
                    },
                    product_image: "https://localhost:4003/scultura-bronzo.jpg",
                    link: "/prodotti/paolo-conti/scultura-bronzo"
                },
                {
                    id: 9,
                    name: "Cappello in Feltro",
                    description: "Cappello artigianale in feltro di lana",
                    price: 89.99,
                    category: ["Accessori", "Moda", "Tessuti"],
                    artisan: {
                        name: "Elena",
                        surname: "Costa",
                        photoProfile: "https://localhost:4003/elena-profile.jpg"
                    },
                    product_image: "https://localhost:4003/cappello-feltro.jpg",
                    link: "/prodotti/elena-costa/cappello-feltro"
                },
                {
                    id: 10,
                    name: "Set di Bicchieri",
                    description: "Set di 6 bicchieri soffiati a mano",
                    price: 169.99,
                    category: ["Vetro", "Casa", "Cucina"],
                    artisan: {
                        name: "Marco",
                        surname: "Ricci",
                        photoProfile: "https://localhost:4003/marco-profile.jpg"
                    },
                    product_image: "https://localhost:4003/set-bicchieri.jpg",
                    link: "/prodotti/marco-ricci/set-bicchieri"
                },
                {
                    id: 11,
                    name: "Bracciale in Rame",
                    description: "Bracciale battuto a mano in rame",
                    price: 69.99,
                    category: ["Gioielli", "Accessori", "Metallo"],
                    artisan: {
                        name: "Lucia",
                        surname: "Galli",
                        photoProfile: "https://localhost:4003/lucia-profile.jpg"
                    },
                    product_image: "https://localhost:4003/bracciale-rame.jpg",
                    link: "/prodotti/lucia-galli/bracciale-rame"
                },
                {
                    id: 12,
                    name: "Specchio Decorato",
                    description: "Specchio con cornice intagliata a mano",
                    price: 259.99,
                    category: ["Arredamento", "Casa", "Legno"],
                    artisan: {
                        name: "Fabio",
                        surname: "Moretti",
                        photoProfile: "https://localhost:4003/fabio-profile.jpg"
                    },
                    product_image: "https://localhost:4003/specchio-decorato.jpg",
                    link: "/prodotti/fabio-moretti/specchio-decorato"
                },
                {
                    id: 13,
                    name: "Cuscino Ricamato",
                    description: "Cuscino con ricami tradizionali",
                    price: 79.99,
                    category: ["Casa", "Tessuti", "Arredamento"],
                    artisan: {
                        name: "Carla",
                        surname: "Vitale",
                        photoProfile: "https://localhost:4003/carla-profile.jpg"
                    },
                    product_image: "https://localhost:4003/cuscino-ricamato.jpg",
                    link: "/prodotti/carla-vitale/cuscino-ricamato"
                },
                {
                    id: 14,
                    name: "Portacandele in Ferro Battuto",
                    description: "Portacandele lavorato a mano",
                    price: 119.99,
                    category: ["Casa", "Decorazione", "Metallo"],
                    artisan: {
                        name: "Antonio",
                        surname: "Ferrari",
                        photoProfile: "https://localhost:4003/antonio-profile.jpg"
                    },
                    product_image: "https://localhost:4003/portacandele-ferro.jpg",
                    link: "/prodotti/antonio-ferrari/portacandele-ferro"
                },
                {
                    id: 15,
                    name: "Set da Tè in Ceramica",
                    description: "Set da tè dipinto a mano",
                    price: 159.99,
                    category: ["Ceramica", "Casa", "Cucina"],
                    artisan: {
                        name: "Marina",
                        surname: "Greco",
                        photoProfile: "https://localhost:4003/marina-profile.jpg"
                    },
                    product_image: "https://localhost:4003/set-te.jpg",
                    link: "/prodotti/marina-greco/set-te"
                },
                {
                    id: 16,
                    name: "Portachiavi in Cuoio",
                    description: "Portachiavi fatto a mano in cuoio",
                    price: 39.99,
                    category: ["Accessori", "Pelle", "Moda"],
                    artisan: {
                        name: "Giuseppe",
                        surname: "Leone",
                        photoProfile: "https://localhost:4003/giuseppe-profile.jpg"
                    },
                    product_image: "https://localhost:4003/portachiavi-cuoio.jpg",
                    link: "/prodotti/giuseppe-leone/portachiavi-cuoio"
                },
                {
                    id: 17,
                    name: "Quadro su Tela",
                    description: "Dipinto originale su tela",
                    price: 449.99,
                    category: ["Arte", "Decorazione", "Casa"],
                    artisan: {
                        name: "Rosa",
                        surname: "Martini",
                        photoProfile: "https://localhost:4003/rosa-profile.jpg"
                    },
                    product_image: "https://localhost:4003/quadro-tela.jpg",
                    link: "/prodotti/rosa-martini/quadro-tela"
                },
                {
                    id: 18,
                    name: "Sciarpa in Seta",
                    description: "Sciarpa dipinta a mano su seta",
                    price: 129.99,
                    category: ["Accessori", "Moda", "Tessuti"],
                    artisan: {
                        name: "Lisa",
                        surname: "Colombo",
                        photoProfile: "https://localhost:4003/lisa-profile.jpg"
                    },
                    product_image: "https://localhost:4003/sciarpa-seta.jpg",
                    link: "/prodotti/lisa-colombo/sciarpa-seta"
                },
                {
                    id: 19,
                    name: "Orologio da Parete",
                    description: "Orologio in legno intagliato",
                    price: 179.99,
                    category: ["Arredamento", "Casa", "Legno"],
                    artisan: {
                        name: "Bruno",
                        surname: "Fabbri",
                        photoProfile: "https://localhost:4003/bruno-profile.jpg"
                    },
                    product_image: "https://localhost:4003/orologio-parete.jpg",
                    link: "/prodotti/bruno-fabbri/orologio-parete"
                },
                {
                    id: 20,
                    name: "Lampada in Legno",
                    description: "Lampada artigianale in legno di ulivo",
                    price: 199.99,
                    category: ["Illuminazione", "Arredamento", "Legno"],
                    artisan: {
                        name: "Marco",
                        surname: "Verdi",
                        photoProfile: "https://localhost:4003/marco-profile.jpg"
                    },
                    product_image: "https://localhost:4003/lampada-legno.jpg",
                    link: "/prodotti/marco-verdi/lampada-legno"
                }
            ],
            pages: 1,
            numberProducts: 20
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Legacy scratch file kept for reference.
// BEFORE:
const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS); // using mock data

// AFTER (Using a useEffect hook to fetch live data):
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchProducts = async () => {
        setLoading(true);
        const fetchedProducts = await DataService.getProducts();
        setProducts(fetchedProducts);
        setLoading(false);
    };
    fetchProducts();
}, []);

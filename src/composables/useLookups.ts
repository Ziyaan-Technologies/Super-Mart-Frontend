import { ref } from 'vue';
import axios from 'axios';

export function useLookups() {
    const categories = ref<any[]>([]);
    const brands = ref<any[]>([]);
    const suppliers = ref<any[]>([]);
    const countries = ref<any[]>([]);
    const cities = ref<any[]>([]);
    const roles = ref<any[]>([]);

    const loadCategories = async () => {
        categories.value = (await axios.get('categories/list')).data;
    };
    const loadBrands = async () => {
        brands.value = (await axios.get('brands/list')).data;
    };
    const loadSuppliers = async () => {
        suppliers.value = (await axios.get('suppliers/list')).data;
    };
    const loadCountries = async () => {
        countries.value = (await axios.get('countries/list')).data;
    };
    const loadCities = async (countryId?: number | null) => {
        cities.value = (await axios.get('cities/list', { params: { country_id: countryId || undefined } })).data;
    };
    const loadRoles = async () => {
        roles.value = (await axios.get('roles/list')).data;
    };

    return { categories, brands, suppliers, countries, cities, roles, loadCategories, loadBrands, loadSuppliers, loadCountries, loadCities, loadRoles };
}

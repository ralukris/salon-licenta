import { useState, useMemo } from "react";
import {
  getStocks,
  addProduct,
  updateStock,
  deactivateProduct,
  activateProduct,
} from "../services/adminApi";

export function useStocks(token) {
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [showAddProductForm, setShowAddProductForm] = useState(false);

  const [newProduct, setNewProduct] = useState({
    denumire_produs: "", unitate_masura: "", cantitate: "",
  });

  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockValue, setEditingStockValue] = useState("");

  const filteredStocks = useMemo(() => {
    const search = stockSearch.trim().toLowerCase();
    if (!search) return stocks;
    return stocks.filter((stock) => {
      const searchableText = `
        ${stock.id_produs || ""} ${stock.id_stoc || ""}
        ${stock.denumire_produs || ""} ${stock.unitate_masura || ""}
        ${stock.cantitate || ""} ${stock.activ ? "activ" : "inactiv"}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [stocks, stockSearch]);

  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const data = await getStocks(token);
      setStocks(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleAddProduct = async () => {
    const data = await addProduct(token, {
      denumire_produs: newProduct.denumire_produs,
      unitate_masura: newProduct.unitate_masura,
      cantitate: Number(newProduct.cantitate),
    });

    setNewProduct({ denumire_produs: "", unitate_masura: "", cantitate: "" });
    setShowAddProductForm(false);
    await fetchStocks();
    return data;
  };

  const startEditStock = (stock) => {
    setEditingStockId(stock.id_stoc);
    setEditingStockValue(String(stock.cantitate));
  };

  const cancelEditStock = () => {
    setEditingStockId(null);
    setEditingStockValue("");
  };

  const handleUpdateStock = async (id_stoc) => {
    const data = await updateStock(token, id_stoc, {
      cantitate: Number(editingStockValue),
    });

    cancelEditStock();
    await fetchStocks();
    return data;
  };

  const handleDeactivateProduct = async (id_produs) => {
    const data = await deactivateProduct(token, id_produs);
    await fetchStocks();
    return data;
  };

  const handleActivateProduct = async (id_produs) => {
    const data = await activateProduct(token, id_produs);
    await fetchStocks();
    return data;
  };

  return {
    stocks, setStocks,
    loadingStocks,
    stockSearch, setStockSearch,
    showAddProductForm, setShowAddProductForm,
    newProduct, setNewProduct,
    editingStockId,
    editingStockValue, setEditingStockValue,
    filteredStocks,
    fetchStocks,
    handleAddProduct,
    startEditStock,
    cancelEditStock,
    handleUpdateStock,
    handleDeactivateProduct,
    handleActivateProduct,
  };
}
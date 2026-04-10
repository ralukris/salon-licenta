import { useState, useMemo } from "react";
import {
  getAvailableReceipts,
  getReceiptsHistory,
  registerPayment,
} from "../services/adminApi";

export function useReceipts(token) {
  const [availableReceipts, setAvailableReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentType, setPaymentType] = useState("Card");

  const [showReceiptsHistory, setShowReceiptsHistory] = useState(false);
  const [receiptsHistory, setReceiptsHistory] = useState([]);
  const [loadingReceiptsHistory, setLoadingReceiptsHistory] = useState(false);
  const [receiptsHistorySearch, setReceiptsHistorySearch] = useState("");

  const filteredReceiptsHistory = useMemo(() => {
    const search = receiptsHistorySearch.trim().toLowerCase();
    if (!search) return receiptsHistory;
    return receiptsHistory.filter((item) => {
      const searchableText = `
        ${item.nr_chitanta || ""} ${item.id_programare || ""}
        ${item.nume_client || ""} ${item.prenume_client || ""}
        ${item.telefon_client || ""} ${item.tip_plata || ""}
        ${item.status_plata || ""} ${item.suma_totala || ""}
      `.toLowerCase().trim();
      return searchableText.includes(search);
    });
  }, [receiptsHistory, receiptsHistorySearch]);

  const fetchAvailableReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const data = await getAvailableReceipts(token);
      setAvailableReceipts(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchReceiptsHistory = async () => {
    setLoadingReceiptsHistory(true);
    try {
      const data = await getReceiptsHistory(token);
      setReceiptsHistory(data);
    } catch (err) {
      throw err;
    } finally {
      setLoadingReceiptsHistory(false);
    }
  };

  const handleRegisterPayment = async () => {
    const data = await registerPayment(token, {
      nr_chitanta: Number(receiptNumber),
      tip_plata: paymentType,
    });

    setReceiptNumber("");
    setPaymentType("Card");
    await fetchAvailableReceipts();
    return data;
  };

  return {
    availableReceipts,
    loadingReceipts,
    receiptNumber, setReceiptNumber,
    paymentType, setPaymentType,
    showReceiptsHistory, setShowReceiptsHistory,
    receiptsHistory,
    loadingReceiptsHistory,
    receiptsHistorySearch, setReceiptsHistorySearch,
    filteredReceiptsHistory,
    fetchAvailableReceipts,
    fetchReceiptsHistory,
    handleRegisterPayment,
  };
}
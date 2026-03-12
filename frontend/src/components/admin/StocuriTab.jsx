function StocuriTab({
  showAddProductForm,
  setShowAddProductForm,
  stockSearch,
  setStockSearch,
  handleAddProduct,
  newProduct,
  setNewProduct,
  loadingStocks,
  filteredStocks,
  editingStockId,
  editingStockValue,
  setEditingStockValue,
  handleUpdateStock,
  cancelEditStock,
  startEditStock,
  handleDeactivateProduct,
}) {
  return (
    <div className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Stocuri salon
        </h3>

        <div className="inline-actions">
          <button
            className="primary-btn"
            onClick={() => setShowAddProductForm((prev) => !prev)}
          >
            {showAddProductForm ? "Închide formularul" : "Adaugă produs nou"}
          </button>
        </div>
      </div>

      {showAddProductForm ? (
        <form
          onSubmit={handleAddProduct}
          className="form-grid"
          style={{ marginBottom: 20 }}
        >
          <input
            type="text"
            placeholder="Denumire produs"
            value={newProduct.denumire_produs}
            onChange={(e) =>
              setNewProduct((prev) => ({
                ...prev,
                denumire_produs: e.target.value,
              }))
            }
            required
          />

          <input
            type="text"
            placeholder="Unitate măsură (ex: buc, ml)"
            value={newProduct.unitate_masura}
            onChange={(e) =>
              setNewProduct((prev) => ({
                ...prev,
                unitate_masura: e.target.value,
              }))
            }
            required
          />

          <input
            type="number"
            min="0"
            placeholder="Cantitate inițială"
            value={newProduct.cantitate}
            onChange={(e) =>
              setNewProduct((prev) => ({
                ...prev,
                cantitate: e.target.value,
              }))
            }
            required
          />

          <button type="submit" className="primary-btn">
            Salvează produs
          </button>
        </form>
      ) : (
        <>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Caută după nume produs, ID produs, cantitate sau unitate de măsură"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>

          {loadingStocks ? (
            <p className="muted-text">Se încarcă stocurile...</p>
          ) : filteredStocks.length === 0 ? (
            <p className="muted-text">
              Nu există produse în stoc care să corespundă căutării.
            </p>
          ) : (
            <div className="profiles-list">
              {filteredStocks.map((stock) => (
                <div key={stock.id_stoc} className="profile-item">
                  <strong>{stock.denumire_produs}</strong>
                  <div className="muted-text">ID produs: {stock.id_produs}</div>
                  <div className="muted-text">
                    Cantitate: {stock.cantitate} {stock.unitate_masura}
                  </div>
                  <div className="muted-text">
                    Produs activ: {stock.activ ? "Da" : "Nu"}
                  </div>

                  {editingStockId === stock.id_stoc ? (
                    <div className="form-grid" style={{ marginTop: 12 }}>
                      <input
                        type="number"
                        min="0"
                        value={editingStockValue}
                        onChange={(e) => setEditingStockValue(e.target.value)}
                        placeholder="Cantitate nouă"
                      />

                      <div className="inline-actions">
                        <button
                          className="primary-btn"
                          onClick={() => handleUpdateStock(stock.id_stoc)}
                          type="button"
                        >
                          Salvează
                        </button>

                        <button
                          className="secondary-btn"
                          onClick={cancelEditStock}
                          type="button"
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-actions" style={{ marginTop: 12 }}>
                      <button
                        className="secondary-btn"
                        onClick={() => startEditStock(stock)}
                      >
                        Editează
                      </button>

                      <button
                        className="danger-btn"
                        onClick={() => handleDeactivateProduct(stock.id_produs)}
                        disabled={!stock.activ}
                      >
                        Dezactivează
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StocuriTab;
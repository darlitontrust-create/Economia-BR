"""Baixa as séries do Banco Central (API SGS) e grava a cópia salva em data/.

Usado pela rotina diária do GitHub (.github/workflows/atualizar-dados.yml).
O painel tenta buscar ao vivo ao abrir; esta cópia é a reserva caso a busca falhe.
"""
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERIES = {"selic": 4189, "ipca": 433, "ipca_12m": 13522, "igpm": 189, "dolar": 3698,
          "desemprego": 24369, "ibcbr": 24364, "divida_pib": 13762}
DATA = Path(__file__).resolve().parent.parent / "data"
BRT = timezone(timedelta(hours=-3))


def sgs(cod, ini, fim):
    url = (f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json"
           f"&dataInicial={ini:%d/%m/%Y}&dataFinal={fim:%d/%m/%Y}")
    req = urllib.request.Request(url, headers={"User-Agent": "painel-economia"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dados = json.load(r)
    if not isinstance(dados, list):
        raise RuntimeError(f"série {cod}: resposta inesperada")
    return dados


def iso(s):
    return f"{s[6:10]}-{s[3:5]}-{s[0:2]}"


def main():
    agora = datetime.now(BRT)
    hoje = agora.date()
    ini = hoje.replace(year=hoje.year - 2, month=1, day=1)

    por_mes = {}
    for campo, cod in SERIES.items():
        for o in sgs(cod, ini, hoje):
            m = iso(o["data"])[:7]
            por_mes.setdefault(m, {"mes": m})[campo] = float(o["valor"])
    mensal = [por_mes[m] for m in sorted(por_mes)]

    periodos = []
    for o in sgs(432, ini, hoje):
        d, v = iso(o["data"]), float(o["valor"])
        if periodos and periodos[-1]["meta"] == v:
            periodos[-1]["fim"] = d
        else:
            periodos.append({"inicio": d, "fim": d, "meta": v})

    diario = [{"data": iso(o["data"]), "ptax": float(o["valor"])}
              for o in sgs(1, hoje - timedelta(days=45), hoje)]

    atualizacao = [{"data": f"{hoje:%Y-%m-%d}", "hora": f"{agora:%H:%M}",
                    "dados_ate": diario[-1]["data"] if diario else ""}]

    DATA.mkdir(exist_ok=True)
    for nome, linhas in [("mensal", mensal), ("selic_meta", periodos),
                         ("dolar_diario", diario), ("atualizacao", atualizacao)]:
        (DATA / f"{nome}.json").write_text(json.dumps({"rows": linhas}, ensure_ascii=False), encoding="utf-8")
    print(f"Atualizado: {len(mensal)} meses, {len(periodos)} decisões, {len(diario)} dias.")


if __name__ == "__main__":
    main()

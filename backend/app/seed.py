"""Explicit, idempotent local assessment initialization: python -m app.seed."""

from datetime import date, timedelta

from argon2 import PasswordHasher

from app.config import Settings
from app.database import connect, initialize

_LEGACY_FIRST_NAMES = (
    "Amara",
    "Daniel",
    "Chioma",
    "James",
    "Fatima",
    "Emmanuel",
    "Zara",
    "David",
    "Ada",
    "Samuel",
    "Aisha",
    "Michael",
    "Grace",
    "Tunde",
    "Nneka",
    "Ibrahim",
)
_LEGACY_LAST_NAMES = ("Okafor", "Adeyemi", "Bello", "Eze", "Williams")


# Explicit fictional profiles avoid repeating a first-name/surname cross product.
DEMO_USER_NAMES = (
    "Amara Okafor",
    "Tobiloba Adeyemi",
    "Chioma Nwankwo",
    "Chinedu Eze",
    "Fatima Abdullahi",
    "Emeka Obi",
    "Zainab Bello",
    "Oluwaseun Adebayo",
    "Adaeze Okonkwo",
    "Damilola Akinwale",
    "Aisha Mohammed",
    "Chukwudi Nnamdi",
    "Folashade Ogunleye",
    "Babatunde Oladipo",
    "Nneka Umeh",
    "Ibrahim Sani",
    "Chiamaka Onyekwere",
    "Olumide Ajayi",
    "Hauwa Garba",
    "Ikenna Nwosu",
    "Temitope Balogun",
    "Obinna Ekwueme",
    "Aminat Yusuf",
    "Olakunle Adegbite",
    "Uchenna Onwudiwe",
    "Nnamdi Ibe",
    "Aderonke Osundare",
    "Suleiman Musa",
    "Ogechi Ezeani",
    "Adewale Afolayan",
    "Maryam Ibrahim",
    "Ifeanyi Okeke",
    "Abimbola Ojo",
    "Chijioke Anozie",
    "Khadija Usman",
    "Ayodeji Fashola",
    "Ngozi Nwachukwu",
    "Jide Alabi",
    "Yetunde Lawal",
    "Abubakar Danjuma",
    "Chinelo Opara",
    "Oladimeji Akinola",
    "Hadiza Kabiru",
    "Osagie Igbinedion",
    "Ebele Nwobodo",
    "Akinwumi Sobowale",
    "Funmilayo Adesina",
    "Mubarak Gidado",
    "Adesewa Shonibare",
    "Chibuzor Ezeoha",
    "Nafisa Shehu",
    "Oghenekaro Okotie",
    "Ndidi Madubuko",
    "Taiwo Adegoke",
    "Omotola Fadeyi",
    "Abdulrahman Dantata",
    "Ezinne Uzochukwu",
    "Olalekan Onabanjo",
    "Halima Maiyaki",
    "Akachukwu Enemuo",
    "Morenike Akinpelu",
    "Kelechi Uzodimma",
    "Efemena Edevbie",
    "Anietie Udoh",
    "Simiat Salami",
    "Chukwuma Igwe",
    "Nkiruka Okwuosa",
    "Terna Aondoakaa",
    "Iniobong Etim",
    "Boluwatife Adetunji",
    "Chidinma Iheanacho",
    "Farouk Rabiu",
    "Oluwakemi Arowolo",
    "Esosa Obaseki",
    "Ijeoma Okechukwu",
    "Tochukwu Nwafor",
    "Rukayat Bamidele",
    "Opeyemi Ogundipe",
    "Arit Ekong",
    "Umar Suleiman",
)


def seed(settings: Settings) -> None:
    if settings.admin_email is None or settings.admin_password is None:
        raise ValueError("Set CREDISURE_ADMIN_EMAIL and CREDISURE_ADMIN_PASSWORD first")
    password = settings.admin_password.get_secret_value()
    if len(password) < 12:
        raise ValueError(
            "The administrator password must contain at least 12 characters"
        )
    initialize(settings.database_path)
    with connect(settings.database_path) as database:
        email = str(settings.admin_email).lower()
        existing = database.execute(
            "SELECT id FROM administrators WHERE email = ?", (email,)
        ).fetchone()
        if existing is None:
            if database.execute("SELECT COUNT(*) FROM administrators").fetchone()[0]:
                raise ValueError(
                    "An administrator already exists; seeding will not replace it"
                )
            database.execute(
                "INSERT INTO administrators(email, password_hash) VALUES (?, ?)",
                (email, PasswordHasher().hash(password)),
            )
        for index, full_name in enumerate(DEMO_USER_NAMES):
            user_email = full_name.lower().replace(" ", ".") + "@example.com"
            database.execute(
                "INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?, ?)",
                (
                    index + 1,
                    full_name,
                    user_email,
                    "admin" if index % 9 == 0 else "member",
                    ("active", "active", "active", "pending", "inactive")[index % 5],
                    (date(2026, 1, 5) + timedelta(days=index * 3)).isoformat(),
                ),
            )
            # Upgrade only identifiable old demo rows, never edited/custom profiles.
            old_first = _LEGACY_FIRST_NAMES[index % len(_LEGACY_FIRST_NAMES)]
            old_last = _LEGACY_LAST_NAMES[index // len(_LEGACY_FIRST_NAMES)]
            database.execute(
                "UPDATE users SET full_name = ?, email = ? "
                "WHERE id = ? AND full_name = ? AND email = ?",
                (
                    full_name,
                    user_email,
                    index + 1,
                    f"{old_first} {old_last}",
                    f"{old_first.lower()}.{old_last.lower()}@example.com",
                ),
            )


if __name__ == "__main__":
    try:
        seed(Settings())
    except ValueError as error:
        raise SystemExit(str(error)) from None
    print(
        "Database initialized. Synthetic users seeded; existing credentials preserved."
    )
